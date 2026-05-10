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

const COLORS = {
  paper: rgb(0.996, 0.985, 0.965),
  line: rgb(0.847, 0.765, 0.624),
  text: rgb(0.105, 0.082, 0.058),
  muted: rgb(0.404, 0.333, 0.262),
  accent: rgb(0.698, 0.549, 0.325),
  pill: rgb(0.953, 0.91, 0.835),
};

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

  ctx.page.drawText("THANK YOU", {
    x: PAGE_WIDTH / 2 - ctx.sansBold.widthOfTextAtSize("THANK YOU", 11) / 2,
    y: 16,
    size: 11,
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
  color: ReturnType<typeof rgb>;
}) {
  const safeText = toPdfText(text);
  const size = getFittedFontSize(safeText, font, maxWidth, preferredSize, minSize);
  page.drawText(safeText, { x, y, size, font, color });
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
  const columnXs = [PAGE_MARGIN, PAGE_MARGIN + 79, PAGE_MARGIN + 157, PAGE_MARGIN + 343, PAGE_MARGIN + 428, PAGE_MARGIN + 494];
  const headerHeight = 31;

  ctx.page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    borderColor: COLORS.line,
    borderWidth: 1,
    color: rgb(0.987, 0.971, 0.945),
  });

  const headers = ["DATE", "TIME", "DESCRIPTION", "HOURS", "RATE", "AMOUNT"];
  headers.forEach((label, index) => {
    ctx.page.drawText(label, {
      x: columnXs[index] + 10,
      y: y - 20,
      size: 10,
      font: ctx.sansBold,
      color: COLORS.muted,
    });
  });
}

function drawTableGrid(
  ctx: PdfContext,
  topY: number,
  rowHeight: number,
  rowCount: number,
) {
  const xPositions = [
    PAGE_MARGIN,
    PAGE_MARGIN + 79,
    PAGE_MARGIN + 157,
    PAGE_MARGIN + 343,
    PAGE_MARGIN + 428,
    PAGE_MARGIN + 494,
    PAGE_WIDTH - PAGE_MARGIN,
  ];

  for (const x of xPositions) {
    ctx.page.drawLine({
      start: { x, y: topY },
      end: { x, y: topY - rowHeight * rowCount },
      thickness: 0.7,
      color: rgb(0.902, 0.854, 0.785),
    });
  }
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
    ensureSpace(ctx, 160);

    const tableTopY = ctx.y;
    drawTableHeader(ctx, tableTopY);
    const bodyTopY = tableTopY - 31;
    const rowHeight = 43;
    const availableRows = Math.max(1, Math.floor((bodyTopY - (FOOTER_HEIGHT + 120)) / rowHeight));
    const pageItems = lineItems.slice(index, index + availableRows);

    drawTableGrid(ctx, bodyTopY, rowHeight, pageItems.length);

    pageItems.forEach((item, rowIndex) => {
      const rowTop = bodyTopY - rowHeight * rowIndex;
      const centers = {
        date: PAGE_MARGIN + 10,
        time: PAGE_MARGIN + 89,
        desc: PAGE_MARGIN + 167,
        hours: PAGE_MARGIN + 353,
        rate: PAGE_MARGIN + 438,
        amount: PAGE_MARGIN + 504,
      };

      ctx.page.drawLine({
        start: { x: PAGE_MARGIN, y: rowTop - rowHeight },
        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: rowTop - rowHeight },
        thickness: 0.7,
        color: rgb(0.902, 0.854, 0.785),
      });

      drawTextFit({
        page: ctx.page,
        text: item.date,
        x: centers.date,
        y: rowTop - 26,
        maxWidth: 60,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawTextFit({
        page: ctx.page,
        text: item.session,
        x: centers.time,
        y: rowTop - 26,
        maxWidth: 58,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });

      const descriptionLines = wrapText(item.description, ctx.sans, 10, 165).slice(0, 2);
      let descriptionY = rowTop - 20;
      for (const line of descriptionLines) {
        ctx.page.drawText(toPdfText(line), {
          x: centers.desc,
          y: descriptionY,
          size: 10,
          font: descriptionY === rowTop - 20 ? ctx.sansBold : ctx.sans,
          color: COLORS.text,
        });
        descriptionY -= 12;
      }

      drawTextFit({
        page: ctx.page,
        text: item.hours,
        x: centers.hours,
        y: rowTop - 26,
        maxWidth: 60,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawTextFit({
        page: ctx.page,
        text: item.rate,
        x: centers.rate,
        y: rowTop - 26,
        maxWidth: 52,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sans,
        color: COLORS.text,
      });
      drawTextFit({
        page: ctx.page,
        text: item.amount,
        x: centers.amount,
        y: rowTop - 26,
        maxWidth: 52,
        preferredSize: 10,
        minSize: 7,
        font: ctx.sansBold,
        color: COLORS.text,
      });
    });

    ctx.y = bodyTopY - rowHeight * pageItems.length - 28;
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
  ctx.page.drawText("AMOUNT DUE", {
    x: totalsStartX + 74,
    y: amountCardY + 22,
    size: 12,
    font: ctx.sansBold,
    color: COLORS.accent,
  });
  ctx.page.drawLine({
    start: { x: totalsStartX + 74, y: amountCardY + 16 },
    end: { x: totalsStartX + totalsWidth - 84, y: amountCardY + 16 },
    thickness: 1,
    color: COLORS.line,
  });
  const amountDueSize = getFittedFontSize(presentation.amountDue, ctx.serif, totalsWidth - 54, 46, 24);
  ctx.page.drawText(toPdfText(presentation.amountDue), {
    x: totalsStartX + (totalsWidth - ctx.serif.widthOfTextAtSize(toPdfText(presentation.amountDue), amountDueSize)) / 2,
    y: amountCardY - 26,
    size: amountDueSize,
    font: ctx.serif,
    color: COLORS.text,
  });

  return pdf.save();
}
