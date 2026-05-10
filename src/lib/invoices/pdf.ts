import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";
import {
  buildInvoicePresentation,
  type PresentedInvoiceLineItem,
} from "@/lib/invoices/presentation";

type InvoicePdfPayload = {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  client: Client | null;
  profile: UserProfile;
  projects: Array<{ id: string; name: string }>;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_HEIGHT = 42;
const HEADER_HEIGHT = 31;
const MIN_TABLE_ROW_HEIGHT = 43;
const TABLE_CELL_PADDING = 8;

const COLORS = {
  paper: rgb(0.996, 0.985, 0.965),
  line: rgb(0.847, 0.765, 0.624),
  text: rgb(0.105, 0.082, 0.058),
  muted: rgb(0.404, 0.333, 0.262),
  accent: rgb(0.698, 0.549, 0.325),
  pill: rgb(0.953, 0.91, 0.835),
};

const TABLE_COLUMNS = {
  date: { x: PAGE_MARGIN, width: 68, label: "DATE" },
  time: { x: PAGE_MARGIN + 68, width: 70, label: "TIME" },
  desc: { x: PAGE_MARGIN + 138, width: 205, label: "DESCRIPTION" },
  hours: { x: PAGE_MARGIN + 343, width: 55, label: "HOURS" },
  rate: { x: PAGE_MARGIN + 398, width: 82, label: "RATE" },
  amount: { x: PAGE_MARGIN + 480, width: CONTENT_WIDTH - 480, label: "AMOUNT" },
};

type PdfColor = ReturnType<typeof rgb>;

type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  serif: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
  y: number;
};

function toPdfText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\r\n/g, "\n");
}

function addStyledPage(ctx: PdfContext) {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: COLORS.paper,
  });

  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: FOOTER_HEIGHT,
    color: rgb(0.968, 0.923, 0.853),
  });

  drawCenteredText({
    page: ctx.page,
    text: "THANK YOU",
    centerX: PAGE_WIDTH / 2,
    y: 16,
    maxWidth: 120,
    preferredSize: 11,
    minSize: 8,
    font: ctx.sansBold,
    color: COLORS.accent,
  });

  ctx.page.drawLine({
    start: { x: PAGE_WIDTH / 2 - 120, y: 20 },
    end: { x: PAGE_WIDTH / 2 - 34, y: 20 },
    thickness: 1,
    color: COLORS.line,
  });
  ctx.page.drawLine({
    start: { x: PAGE_WIDTH / 2 + 34, y: 20 },
    end: { x: PAGE_WIDTH / 2 + 120, y: 20 },
    thickness: 1,
    color: COLORS.line,
  });

  ctx.y = PAGE_HEIGHT - PAGE_MARGIN;
}

function ensureSpace(ctx: PdfContext, height: number) {
  if (ctx.y - height >= FOOTER_HEIGHT + 24) {
    return;
  }

  addStyledPage(ctx);
}

function splitLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const chunks: string[] = [];
  let current = "";

  for (const char of word) {
    const candidate = `${current}${char}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
      current = candidate;
    } else {
      chunks.push(current);
      current = char;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const lines: string[] = [];

  for (const paragraph of toPdfText(text).split("\n")) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/).flatMap((word) => {
      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        return [word];
      }

      return splitLongWord(word, font, fontSize, maxWidth);
    });
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function getFittedFontSize(text: string, font: PDFFont, maxWidth: number, preferredSize: number, minSize: number) {
  let size = preferredSize;
  const safeText = toPdfText(text);

  while (size > minSize && font.widthOfTextAtSize(safeText, size) > maxWidth) {
    size -= 1;
  }

  return size;
}

function drawTextFit({
  page,
  text,
  x,
  y,
  maxWidth,
  preferredSize,
  minSize,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  preferredSize: number;
  minSize: number;
  font: PDFFont;
  color: PdfColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedFontSize(safeText, font, maxWidth, preferredSize, minSize);
  page.drawText(safeText, { x, y, size, font, color });
  return size;
}

function drawRightAlignedText({
  page,
  text,
  rightX,
  y,
  maxWidth,
  preferredSize,
  minSize,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  rightX: number;
  y: number;
  maxWidth: number;
  preferredSize: number;
  minSize: number;
  font: PDFFont;
  color: PdfColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedFontSize(safeText, font, maxWidth, preferredSize, minSize);
  const width = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: rightX - width, y, size, font, color });
  return size;
}

function drawCenteredText({
  page,
  text,
  centerX,
  y,
  maxWidth,
  preferredSize,
  minSize,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  centerX: number;
  y: number;
  maxWidth: number;
  preferredSize: number;
  minSize: number;
  font: PDFFont;
  color: PdfColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedFontSize(safeText, font, maxWidth, preferredSize, minSize);
  const width = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: centerX - width / 2, y, size, font, color });
  return size;
}

function drawLabelRow(
  ctx: PdfContext,
  label: string,
  value: string,
  topY: number,
  startX: number,
  width: number,
  bottomBorder = true,
) {
  const labelSize = 10;
  const valueSize = 12;
  const labelWidth = 96;
  const valueX = startX + labelWidth;
  const valueMaxWidth = Math.max(20, width - labelWidth);

  ctx.page.drawText(label.toUpperCase(), {
    x: startX,
    y: topY - labelSize,
    size: labelSize,
    font: ctx.sansBold,
    color: COLORS.accent,
  });

  drawTextFit({
    page: ctx.page,
    text: value,
    x: valueX,
    y: topY - valueSize,
    maxWidth: valueMaxWidth,
    preferredSize: valueSize,
    minSize: 8,
    font: ctx.sans,
    color: COLORS.text,
  });

  if (bottomBorder) {
    ctx.page.drawLine({
      start: { x: startX, y: topY - 21 },
      end: { x: startX + width, y: topY - 21 },
      thickness: 0.8,
      color: rgb(0.902, 0.854, 0.785),
    });
  }
}

function drawTableHeader(ctx: PdfContext, y: number) {
  ctx.page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: HEADER_HEIGHT,
    borderColor: COLORS.line,
    borderWidth: 1,
    color: rgb(0.987, 0.971, 0.945),
  });

  Object.values(TABLE_COLUMNS).forEach((column) => {
    const isNumeric = ["HOURS", "RATE", "AMOUNT"].includes(column.label);
    const textY = y - 20;

    if (isNumeric) {
      drawRightAlignedText({
        page: ctx.page,
        text: column.label,
        rightX: column.x + column.width - TABLE_CELL_PADDING,
        y: textY,
        maxWidth: column.width - TABLE_CELL_PADDING * 2,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sansBold,
        color: COLORS.muted,
      });
      return;
    }

    ctx.page.drawText(column.label, {
      x: column.x + TABLE_CELL_PADDING,
      y: textY,
      size: 10,
      font: ctx.sansBold,
      color: COLORS.muted,
    });
  });
}

function drawTableGrid(ctx: PdfContext, topY: number, rowHeights: number[]) {
  const xPositions = [
    TABLE_COLUMNS.date.x,
    TABLE_COLUMNS.time.x,
    TABLE_COLUMNS.desc.x,
    TABLE_COLUMNS.hours.x,
    TABLE_COLUMNS.rate.x,
    TABLE_COLUMNS.amount.x,
    PAGE_WIDTH - PAGE_MARGIN,
  ];
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);

  for (const x of xPositions) {
    ctx.page.drawLine({
      start: { x, y: topY },
      end: { x, y: topY - totalHeight },
      thickness: 0.7,
      color: rgb(0.902, 0.854, 0.785),
    });
  }

  let y = topY;
  for (const rowHeight of rowHeights) {
    y -= rowHeight;
    ctx.page.drawLine({
      start: { x: PAGE_MARGIN, y },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
      thickness: 0.7,
      color: rgb(0.902, 0.854, 0.785),
    });
  }
}

function getLineItemText(item: PresentedInvoiceLineItem, ctx: PdfContext) {
  const descriptionLines = wrapText(
    item.description,
    ctx.sans,
    10,
    TABLE_COLUMNS.desc.width - TABLE_CELL_PADDING * 2,
  ).slice(0, 3);
  const metaLines = item.meta
    ? wrapText(item.meta, ctx.sans, 8, TABLE_COLUMNS.desc.width - TABLE_CELL_PADDING * 2).slice(0, 1)
    : [];

  return { descriptionLines, metaLines };
}

function getLineItemRowHeight(item: PresentedInvoiceLineItem, ctx: PdfContext) {
  const { descriptionLines, metaLines } = getLineItemText(item, ctx);
  return Math.max(MIN_TABLE_ROW_HEIGHT, 22 + descriptionLines.length * 12 + metaLines.length * 10);
}

function drawLineItemsTable(ctx: PdfContext, lineItems: PresentedInvoiceLineItem[]) {
  if (lineItems.length === 0) {
    ensureSpace(ctx, 90);
    ctx.page.drawRectangle({
      x: PAGE_MARGIN,
      y: ctx.y - 62,
      width: CONTENT_WIDTH,
      height: 62,
      borderColor: COLORS.line,
      borderWidth: 1,
      color: rgb(0.987, 0.971, 0.945),
    });
    ctx.page.drawText("NO BILLABLE ITEMS", {
      x: PAGE_MARGIN + 18,
      y: ctx.y - 26,
      size: 11,
      font: ctx.sansBold,
      color: COLORS.accent,
    });
    ctx.page.drawText("Add at least one line item before sending this invoice.", {
      x: PAGE_MARGIN + 18,
      y: ctx.y - 44,
      size: 10,
      font: ctx.sans,
      color: COLORS.muted,
    });
    ctx.y -= 90;
    return;
  }

  let index = 0;

  while (index < lineItems.length) {
    ensureSpace(ctx, HEADER_HEIGHT + MIN_TABLE_ROW_HEIGHT + 24);

    const tableTopY = ctx.y;
    drawTableHeader(ctx, tableTopY);
    let rowTop = tableTopY - HEADER_HEIGHT;
    const pageItems: PresentedInvoiceLineItem[] = [];
    const rowHeights: number[] = [];

    while (index + pageItems.length < lineItems.length) {
      const candidate = lineItems[index + pageItems.length];
      const candidateHeight = getLineItemRowHeight(candidate, ctx);
      const usedHeight = rowHeights.reduce((sum, height) => sum + height, 0);
      const remainingY = rowTop - usedHeight - candidateHeight;

      if (pageItems.length > 0 && remainingY < FOOTER_HEIGHT + 118) {
        break;
      }

      pageItems.push(candidate);
      rowHeights.push(candidateHeight);

      if (remainingY < FOOTER_HEIGHT + 118) {
        break;
      }
    }

    drawTableGrid(ctx, rowTop, rowHeights);

    pageItems.forEach((item, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];
      const contentTop = rowTop - rowHeights.slice(0, rowIndex).reduce((sum, height) => sum + height, 0);
      const singleLineY = contentTop - rowHeight / 2 - 4;
      const { descriptionLines, metaLines } = getLineItemText(item, ctx);
      let descriptionY = contentTop - 16;

      drawTextFit({
        page: ctx.page,
        text: item.date,
        x: TABLE_COLUMNS.date.x + TABLE_CELL_PADDING,
        y: singleLineY,
        maxWidth: TABLE_COLUMNS.date.width - TABLE_CELL_PADDING * 2,
        preferredSize: 9,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawTextFit({
        page: ctx.page,
        text: item.session,
        x: TABLE_COLUMNS.time.x + TABLE_CELL_PADDING,
        y: singleLineY,
        maxWidth: TABLE_COLUMNS.time.width - TABLE_CELL_PADDING * 2,
        preferredSize: 9,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });

      for (const line of descriptionLines) {
        ctx.page.drawText(toPdfText(line), {
          x: TABLE_COLUMNS.desc.x + TABLE_CELL_PADDING,
          y: descriptionY,
          size: 10,
          font: descriptionY === contentTop - 16 ? ctx.sansBold : ctx.sans,
          color: COLORS.text,
        });
        descriptionY -= 12;
      }

      for (const line of metaLines) {
        ctx.page.drawText(toPdfText(line), {
          x: TABLE_COLUMNS.desc.x + TABLE_CELL_PADDING,
          y: descriptionY - 1,
          size: 8,
          font: ctx.sans,
          color: COLORS.muted,
        });
      }

      drawRightAlignedText({
        page: ctx.page,
        text: item.hours,
        rightX: TABLE_COLUMNS.hours.x + TABLE_COLUMNS.hours.width - TABLE_CELL_PADDING,
        y: singleLineY,
        maxWidth: TABLE_COLUMNS.hours.width - TABLE_CELL_PADDING * 2,
        preferredSize: 9,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawRightAlignedText({
        page: ctx.page,
        text: item.rate,
        rightX: TABLE_COLUMNS.rate.x + TABLE_COLUMNS.rate.width - TABLE_CELL_PADDING,
        y: singleLineY,
        maxWidth: TABLE_COLUMNS.rate.width - TABLE_CELL_PADDING * 2,
        preferredSize: 9,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawRightAlignedText({
        page: ctx.page,
        text: item.amount,
        rightX: TABLE_COLUMNS.amount.x + TABLE_COLUMNS.amount.width - TABLE_CELL_PADDING,
        y: singleLineY,
        maxWidth: TABLE_COLUMNS.amount.width - TABLE_CELL_PADDING * 2,
        preferredSize: 9,
        minSize: 7,
        font: ctx.sansBold,
        color: COLORS.text,
      });
    });

    ctx.y = rowTop - rowHeights.reduce((sum, height) => sum + height, 0) - 28;
    index += pageItems.length;

    if (index < lineItems.length) {
      addStyledPage(ctx);
    }
  }
}

export async function buildInvoicePdfBuffer(payload: InvoicePdfPayload) {
  const pdf = await PDFDocument.create();
  const ctx: PdfContext = {
    doc: pdf,
    page: null as unknown as PDFPage,
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    y: PAGE_HEIGHT - PAGE_MARGIN,
  };

  const presentation = buildInvoicePresentation(payload);
  addStyledPage(ctx);

  const leftColumnWidth = 190;
  const rightColumnX = PAGE_MARGIN + leftColumnWidth + 56;

  ctx.page.drawCircle({
    x: PAGE_MARGIN + 36,
    y: ctx.y - 30,
    size: 36,
    borderColor: COLORS.line,
    borderWidth: 1.4,
  });
  ctx.page.drawText(presentation.monogram, {
    x: PAGE_MARGIN + 14,
    y: ctx.y - 53,
    size: 46,
    font: ctx.serif,
    color: COLORS.text,
  });

  const businessNameLines = wrapText(presentation.businessName, ctx.serif, 31, leftColumnWidth).slice(0, 2);
  let businessNameY = ctx.y - 108;
  for (const line of businessNameLines) {
    ctx.page.drawText(line, {
      x: PAGE_MARGIN,
      y: businessNameY,
      size: 31,
      font: ctx.serif,
      color: COLORS.text,
    });
    businessNameY -= 34;
  }

  const businessLines = [
    presentation.contactEmail,
    presentation.contactPhone,
    presentation.contactAddress,
  ]
    .filter(Boolean)
    .map((value) => toPdfText(value));
  let leftInfoY = Math.min(ctx.y - 164, businessNameY - 16);
  for (const line of businessLines) {
    const lines = wrapText(line, ctx.sans, 11, leftColumnWidth);
    for (const wrappedLine of lines) {
      ctx.page.drawText(wrappedLine, {
        x: PAGE_MARGIN,
        y: leftInfoY,
        size: 11,
        font: ctx.sans,
        color: COLORS.muted,
      });
      leftInfoY -= 15;
    }
    leftInfoY -= 4;
  }

  const billToTop = Math.min(leftInfoY - 14, ctx.y - 238);
  ctx.page.drawRectangle({
    x: PAGE_MARGIN,
    y: billToTop - 112,
    width: 210,
    height: 112,
    color: rgb(1, 1, 1),
    opacity: 0.54,
    borderColor: rgb(0.943, 0.91, 0.857),
    borderWidth: 1,
  });
  ctx.page.drawText("BILL TO", {
    x: PAGE_MARGIN + 14,
    y: billToTop - 18,
    size: 10,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  ctx.page.drawLine({
    start: { x: PAGE_MARGIN + 14, y: billToTop - 28 },
    end: { x: PAGE_MARGIN + 194, y: billToTop - 28 },
    thickness: 1,
    color: COLORS.line,
  });
  const clientNameLines = wrapText(presentation.clientName, ctx.serif, 22, 178).slice(0, 2);
  let clientNameY = billToTop - 58;
  for (const line of clientNameLines) {
    ctx.page.drawText(line, {
      x: PAGE_MARGIN + 14,
      y: clientNameY,
      size: 22,
      font: ctx.serif,
      color: COLORS.text,
    });
    clientNameY -= 23;
  }
  const clientInfo = [presentation.clientCompany, presentation.clientEmail, presentation.clientPhone]
    .filter(Boolean)
    .join("  ");
  if (clientInfo) {
    const clientInfoLines = wrapText(clientInfo, ctx.sans, 10, 178).slice(0, 2);
    let clientInfoY = Math.min(billToTop - 82, clientNameY - 4);
    for (const line of clientInfoLines) {
      ctx.page.drawText(line, {
        x: PAGE_MARGIN + 14,
        y: clientInfoY,
        size: 10,
        font: ctx.sans,
        color: COLORS.muted,
      });
      clientInfoY -= 12;
    }
  }

  const invoiceTitle = "INVOICE";
  ctx.page.drawText(invoiceTitle, {
    x: PAGE_WIDTH - PAGE_MARGIN - ctx.serif.widthOfTextAtSize(invoiceTitle, 56),
    y: ctx.y - 38,
    size: 56,
    font: ctx.serif,
    color: COLORS.text,
  });
  const dividerY = ctx.y - 68;
  ctx.page.drawLine({
    start: { x: rightColumnX, y: dividerY },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: dividerY },
    thickness: 1,
    color: COLORS.line,
  });
  ctx.page.drawText("*", {
    x: rightColumnX + (PAGE_WIDTH - PAGE_MARGIN - rightColumnX) / 2 - 2,
    y: dividerY - 4,
    size: 12,
    font: ctx.sansBold,
    color: COLORS.accent,
  });

  const detailTopY = ctx.y - 116;
  ctx.page.drawLine({
    start: { x: rightColumnX, y: detailTopY + 8 },
    end: { x: rightColumnX, y: detailTopY - 170 },
    thickness: 1,
    color: COLORS.line,
  });

  drawLabelRow(ctx, "Invoice #", presentation.invoiceNumber, detailTopY, rightColumnX + 18, 250);
  ctx.page.drawText("STATUS", {
    x: rightColumnX + 18,
    y: detailTopY - 36,
    size: 10,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  ctx.page.drawRectangle({
    x: rightColumnX + 146,
    y: detailTopY - 48,
    width: 68,
    height: 22,
    borderColor: COLORS.pill,
    borderWidth: 1,
    color: COLORS.pill,
  });
  drawTextFit({
    page: ctx.page,
    text: presentation.statusLabel,
    x: rightColumnX + 156,
    y: detailTopY - 40,
    maxWidth: 48,
    preferredSize: 10,
    minSize: 7,
    font: ctx.sans,
    color: COLORS.muted,
  });
  ctx.page.drawLine({
    start: { x: rightColumnX + 18, y: detailTopY - 66 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: detailTopY - 66 },
    thickness: 0.8,
    color: rgb(0.902, 0.854, 0.785),
  });
  drawLabelRow(ctx, "Issue Date", presentation.issueDate, detailTopY - 102, rightColumnX + 18, 250);
  if (presentation.dueDate) {
    drawLabelRow(ctx, "Due Date", presentation.dueDate, detailTopY - 140, rightColumnX + 18, 250);
  }
  if (presentation.servicePeriod) {
    drawLabelRow(
      ctx,
      "Service Period",
      presentation.servicePeriod,
      detailTopY - 178,
      rightColumnX + 18,
      250,
    );
  }
  drawLabelRow(
    ctx,
    "Tracked Hours",
    presentation.trackedHours,
    detailTopY - 216,
    rightColumnX + 18,
    250,
    false,
  );

  ctx.y = detailTopY - 258;
  drawLineItemsTable(ctx, presentation.lineItems);

  ensureSpace(ctx, 220);
  const lowerTopY = ctx.y;
  const dividerX = PAGE_MARGIN + 252;

  ctx.page.drawLine({
    start: { x: dividerX, y: lowerTopY + 8 },
    end: { x: dividerX, y: lowerTopY - 176 },
    thickness: 1,
    color: COLORS.line,
  });

  ctx.page.drawText("PAYMENT TERMS", {
    x: PAGE_MARGIN + 58,
    y: lowerTopY - 12,
    size: 11,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  drawTextFit({
    page: ctx.page,
    text: presentation.paymentTerms,
    x: PAGE_MARGIN + 58,
    y: lowerTopY - 38,
    maxWidth: 168,
    preferredSize: 15,
    minSize: 9,
    font: ctx.sans,
    color: COLORS.text,
  });
  const instructions = wrapText(
    payload.invoice.paymentInstructions ||
      payload.profile.paymentInstructions ||
      "Please include the invoice number with your payment.",
    ctx.sans,
    10,
    168,
  );
  let instructionsY = lowerTopY - 58;
  for (const line of instructions.slice(0, 4)) {
    ctx.page.drawText(line, {
      x: PAGE_MARGIN + 58,
      y: instructionsY,
      size: 10,
      font: ctx.sans,
      color: COLORS.muted,
    });
    instructionsY -= 13;
  }

  ctx.page.drawLine({
    start: { x: PAGE_MARGIN, y: lowerTopY - 86 },
    end: { x: dividerX - 36, y: lowerTopY - 86 },
    thickness: 0.8,
    color: rgb(0.902, 0.854, 0.785),
  });

  ctx.page.drawText("NOTES", {
    x: PAGE_MARGIN + 58,
    y: lowerTopY - 126,
    size: 11,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  const noteLines = wrapText(presentation.notes, ctx.sans, 10, 168);
  let notesY = lowerTopY - 152;
  for (const line of noteLines.slice(0, 5)) {
    ctx.page.drawText(line, {
      x: PAGE_MARGIN + 58,
      y: notesY,
      size: 10,
      font: ctx.sans,
      color: COLORS.text,
    });
    notesY -= 13;
  }

  const totalsStartX = dividerX + 26;
  const totalsWidth = PAGE_WIDTH - PAGE_MARGIN - totalsStartX;
  drawLabelRow(ctx, "Subtotal", presentation.subtotal, lowerTopY - 10, totalsStartX, totalsWidth);
  if (presentation.showTax) {
    drawLabelRow(ctx, presentation.taxLabel, presentation.tax, lowerTopY - 48, totalsStartX, totalsWidth);
  }
  if (presentation.showDiscount) {
    drawLabelRow(ctx, "Discount", presentation.discount, lowerTopY - 86, totalsStartX, totalsWidth);
  }

  const amountCardY = lowerTopY - 176;
  ctx.page.drawRectangle({
    x: totalsStartX + 10,
    y: amountCardY - 62,
    width: totalsWidth - 20,
    height: 112,
    borderColor: COLORS.line,
    borderWidth: 1.2,
    color: rgb(0.997, 0.99, 0.975),
  });
  const amountCardCenterX = totalsStartX + totalsWidth / 2;
  drawCenteredText({
    page: ctx.page,
    text: "AMOUNT DUE",
    centerX: amountCardCenterX,
    y: amountCardY + 22,
    maxWidth: totalsWidth - 48,
    preferredSize: 12,
    minSize: 9,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  ctx.page.drawLine({
    start: { x: totalsStartX + 48, y: amountCardY + 16 },
    end: { x: totalsStartX + totalsWidth - 48, y: amountCardY + 16 },
    thickness: 1,
    color: COLORS.line,
  });
  drawCenteredText({
    page: ctx.page,
    text: presentation.amountDue,
    centerX: amountCardCenterX,
    y: amountCardY - 26,
    maxWidth: totalsWidth - 54,
    preferredSize: 46,
    minSize: 24,
    font: ctx.serif,
    color: COLORS.text,
  });

  return pdf.save();
}
