import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCurrency, formatDecimalHours, formatMinutes, formatTimeRange, getRuleLabel } from "@/lib/billing-rules";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";

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
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_MARGIN = 30;
const FONT_SIZES = {
  title: 28,
  heading: 11,
  body: 10,
  small: 9,
};

type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
};

function toPdfText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "?")
    .replace(/\r\n/g, "\n");
}

function formatLongDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const normalized = toPdfText(text).split("\n");
  const lines: string[] = [];

  normalized.forEach((paragraph) => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) {
      lines.push("");
      return;
    }

    const words = trimmedParagraph.split(/\s+/);
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        currentLine = word;
        return;
      }

      let partial = "";
      for (const char of word) {
        const nextPartial = `${partial}${char}`;
        if (font.widthOfTextAtSize(nextPartial, fontSize) <= maxWidth) {
          partial = nextPartial;
          continue;
        }

        if (partial) {
          lines.push(partial);
        }
        partial = char;
      }

      currentLine = partial;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

function ensureSpace(ctx: PdfContext, requiredHeight: number) {
  if (ctx.y - requiredHeight > FOOTER_MARGIN) {
    return;
  }

  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - PAGE_MARGIN;
}

function drawTextBlock(
  ctx: PdfContext,
  lines: string[],
  options: {
    x?: number;
    font?: PDFFont;
    fontSize?: number;
    color?: ReturnType<typeof rgb>;
    lineGap?: number;
  } = {},
) {
  const font = options.font ?? ctx.font;
  const fontSize = options.fontSize ?? FONT_SIZES.body;
  const x = options.x ?? PAGE_MARGIN;
  const color = options.color ?? rgb(0.2, 0.23, 0.27);
  const lineGap = options.lineGap ?? 4;
  const lineHeight = fontSize + lineGap;

  lines.forEach((line) => {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(line, {
      x,
      y: ctx.y - fontSize,
      size: fontSize,
      font,
      color,
    });
    ctx.y -= lineHeight;
  });
}

function drawLabelValueRows(
  ctx: PdfContext,
  rows: Array<{ label: string; value: string }>,
  x: number,
  width: number,
) {
  rows.forEach(({ label, value }) => {
    const labelWidth = 80;
    const valueWidth = Math.max(40, width - labelWidth - 10);
    const valueLines = wrapText(value || "-", ctx.font, FONT_SIZES.body, valueWidth);
    const rowHeight = Math.max(18, valueLines.length * (FONT_SIZES.body + 3) + 4);
    ensureSpace(ctx, rowHeight + 6);

    ctx.page.drawText(toPdfText(label), {
      x,
      y: ctx.y - FONT_SIZES.small,
      size: FONT_SIZES.small,
      font: ctx.boldFont,
      color: rgb(0.43, 0.48, 0.53),
    });

    let valueY = ctx.y;
    valueLines.forEach((line) => {
      ctx.page.drawText(line || "-", {
        x: x + labelWidth,
        y: valueY - FONT_SIZES.body,
        size: FONT_SIZES.body,
        font: ctx.font,
        color: rgb(0.15, 0.18, 0.22),
      });
      valueY -= FONT_SIZES.body + 3;
    });

    ctx.y -= rowHeight;
  });
}

function drawSectionHeading(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 22);
  ctx.page.drawText(toPdfText(title), {
    x: PAGE_MARGIN,
    y: ctx.y - FONT_SIZES.small,
    size: FONT_SIZES.small,
    font: ctx.boldFont,
    color: rgb(0.43, 0.48, 0.53),
  });
  ctx.y -= 18;
}

function drawDivider(ctx: PdfContext) {
  ensureSpace(ctx, 12);
  ctx.page.drawLine({
    start: { x: PAGE_MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: ctx.y },
    thickness: 1,
    color: rgb(0.87, 0.89, 0.91),
  });
  ctx.y -= 12;
}

function drawTableHeader(ctx: PdfContext, columnXs: number[]) {
  ensureSpace(ctx, 26);
  const headerY = ctx.y;
  ctx.page.drawRectangle({
    x: PAGE_MARGIN,
    y: headerY - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.95, 0.96, 0.98),
  });

  const headers = ["Date", "Session", "Description", "Time", "Rate", "Amount"];
  headers.forEach((label, index) => {
    ctx.page.drawText(label, {
      x: columnXs[index],
      y: headerY - 12,
      size: FONT_SIZES.small,
      font: ctx.boldFont,
      color: rgb(0.32, 0.37, 0.42),
    });
  });

  ctx.y -= 24;
}

function drawInvoiceItemsTable(
  ctx: PdfContext,
  invoiceItems: InvoiceItem[],
  timeEntries: TimeEntry[],
  projects: Array<{ id: string; name: string }>,
  currency: string,
) {
  const sortedItems = [...invoiceItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const columnXs = [PAGE_MARGIN + 4, PAGE_MARGIN + 68, PAGE_MARGIN + 152, PAGE_MARGIN + 380, PAGE_MARGIN + 438, PAGE_MARGIN + 496];

  drawSectionHeading(ctx, "Line items");
  drawTableHeader(ctx, columnXs);

  sortedItems.forEach((item) => {
    const entry = timeEntries.find((candidate) => candidate.id === item.timeEntryId);
    const project = projects.find((candidate) => candidate.id === entry?.projectId);
    const projectDisplayName = item.projectNameSnapshot || project?.name || "Hourly work";
    const descriptionText = `${item.description}\n${entry ? getRuleLabel(entry.billingRuleSnapshot.rule) : "Manual entry"} - ${projectDisplayName}`;
    const descriptionLines = wrapText(descriptionText, ctx.font, FONT_SIZES.body, 210);
    const rowLineHeight = FONT_SIZES.body + 3;
    const rowHeight = Math.max(24, descriptionLines.length * rowLineHeight + 10);

    if (ctx.y - rowHeight < FOOTER_MARGIN) {
      ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      ctx.y = PAGE_HEIGHT - PAGE_MARGIN;
      drawTableHeader(ctx, columnXs);
    }

    const topY = ctx.y;
    ctx.page.drawLine({
      start: { x: PAGE_MARGIN, y: topY },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: topY },
      thickness: 0.5,
      color: rgb(0.9, 0.92, 0.94),
    });

    ctx.page.drawText(entry?.entryDate ? formatLongDate(entry.entryDate) : "-", {
      x: columnXs[0],
      y: topY - 14,
      size: FONT_SIZES.small,
      font: ctx.font,
      color: rgb(0.35, 0.39, 0.44),
    });
    ctx.page.drawText(entry ? formatTimeRange(entry.startTime, entry.endTime) || "-" : "-", {
      x: columnXs[1],
      y: topY - 14,
      size: FONT_SIZES.small,
      font: ctx.font,
      color: rgb(0.35, 0.39, 0.44),
    });

    let descriptionY = topY - 14;
    descriptionLines.forEach((line, index) => {
      ctx.page.drawText(line || "-", {
        x: columnXs[2],
        y: descriptionY,
        size: index === 0 ? FONT_SIZES.body : FONT_SIZES.small,
        font: index === 0 ? ctx.boldFont : ctx.font,
        color: index === 0 ? rgb(0.15, 0.18, 0.22) : rgb(0.35, 0.39, 0.44),
      });
      descriptionY -= rowLineHeight;
    });

    ctx.page.drawText(formatMinutes(item.billedMinutes), {
      x: columnXs[3],
      y: topY - 14,
      size: FONT_SIZES.small,
      font: ctx.font,
      color: rgb(0.15, 0.18, 0.22),
    });
    ctx.page.drawText(`${formatCurrency(item.hourlyRate, currency)}/hr`, {
      x: columnXs[4],
      y: topY - 14,
      size: FONT_SIZES.small,
      font: ctx.font,
      color: rgb(0.15, 0.18, 0.22),
    });
    ctx.page.drawText(formatCurrency(item.amount, currency), {
      x: columnXs[5],
      y: topY - 14,
      size: FONT_SIZES.small,
      font: ctx.boldFont,
      color: rgb(0.15, 0.18, 0.22),
    });

    ctx.y -= rowHeight;
  });

  drawDivider(ctx);
}

export async function buildInvoicePdfBuffer(payload: InvoicePdfPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ctx: PdfContext = {
    doc: pdf,
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    font,
    boldFont,
    y: PAGE_HEIGHT - PAGE_MARGIN,
  };

  const { invoice, invoiceItems, timeEntries, client, profile, projects } = payload;
  const currency = profile.defaultCurrency || "$";
  const linkedEntries = invoiceItems
    .map((item) => timeEntries.find((entry) => entry.id === item.timeEntryId))
    .filter((entry): entry is TimeEntry => Boolean(entry));
  const serviceDates = linkedEntries
    .map((entry) => entry.entryDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const servicePeriod =
    serviceDates.length === 0
      ? "-"
      : serviceDates[0] === serviceDates[serviceDates.length - 1]
        ? formatLongDate(serviceDates[0])
        : `${formatLongDate(serviceDates[0])} - ${formatLongDate(serviceDates[serviceDates.length - 1])}`;
  const totalBilledMinutes = invoiceItems.reduce((sum, item) => sum + item.billedMinutes, 0);
  const noteText = invoice.notes || "Generated from tracked work entries and saved billing settings.";
  const paymentInstructions =
    invoice.paymentInstructions ||
    profile.paymentInstructions ||
    "Please include the invoice number with your payment.";
  const displayClientName = invoice.clientNameSnapshot || client?.name || "Client";
  const displayClientCompany = invoice.clientCompanySnapshot || client?.companyName || "";
  const displayClientEmail = invoice.clientEmailSnapshot || client?.email || "";
  const displayClientPhone = invoice.clientPhoneSnapshot || client?.phone || "";
  const displayClientAddress = invoice.clientAddressSnapshot || client?.billingAddress || "";

  ctx.page.drawText(toPdfText(profile.businessName || "My Business"), {
    x: PAGE_MARGIN,
    y: ctx.y - FONT_SIZES.title,
    size: FONT_SIZES.title,
    font: boldFont,
    color: rgb(0.09, 0.12, 0.16),
  });
  ctx.page.drawText("Invoice", {
    x: PAGE_WIDTH - PAGE_MARGIN - boldFont.widthOfTextAtSize("Invoice", FONT_SIZES.title),
    y: ctx.y - FONT_SIZES.title,
    size: FONT_SIZES.title,
    font: boldFont,
    color: rgb(0.09, 0.12, 0.16),
  });
  ctx.y -= 38;

  drawTextBlock(
    ctx,
    [
      toPdfText(profile.fullName),
      toPdfText(profile.email),
      toPdfText(profile.phone),
      ...toPdfText(profile.address).split("\n"),
    ].filter(Boolean),
    { fontSize: FONT_SIZES.body, lineGap: 2, color: rgb(0.35, 0.39, 0.44) },
  );

  const rightColumnX = 360;
  const headerRightStartY = PAGE_HEIGHT - PAGE_MARGIN - 38;
  ctx.page.drawText(`Invoice #: ${toPdfText(invoice.invoiceNumber)}`, {
    x: rightColumnX,
    y: headerRightStartY - FONT_SIZES.body,
    size: FONT_SIZES.body,
    font: boldFont,
    color: rgb(0.15, 0.18, 0.22),
  });
  ctx.page.drawText(`Status: ${toPdfText(invoice.status.toUpperCase())}`, {
    x: rightColumnX,
    y: headerRightStartY - 28,
    size: FONT_SIZES.body,
    font: font,
    color: rgb(0.35, 0.39, 0.44),
  });
  ctx.page.drawText(`Total: ${formatCurrency(invoice.totalAmount, currency)}`, {
    x: rightColumnX,
    y: headerRightStartY - 46,
    size: FONT_SIZES.body,
    font: boldFont,
    color: rgb(0.02, 0.55, 0.38),
  });

  ctx.y = Math.min(ctx.y, headerRightStartY - 60);
  drawDivider(ctx);

  drawSectionHeading(ctx, "Bill to");
  drawTextBlock(
    ctx,
    [
      toPdfText(displayClientName),
      toPdfText(displayClientCompany),
      toPdfText(displayClientEmail),
      toPdfText(displayClientPhone),
      ...toPdfText(displayClientAddress).split("\n"),
    ].filter(Boolean),
    { font: ctx.font, fontSize: FONT_SIZES.body, lineGap: 3, color: rgb(0.15, 0.18, 0.22) },
  );
  ctx.y -= 6;

  drawDivider(ctx);
  drawSectionHeading(ctx, "Invoice details");
  drawLabelValueRows(
    ctx,
    [
      { label: "Issue date", value: formatLongDate(invoice.invoiceDate) },
      { label: "Due date", value: formatLongDate(invoice.dueDate) },
      { label: "Service", value: servicePeriod },
      { label: "Tracked hours", value: `${formatDecimalHours(totalBilledMinutes)} hrs` },
    ],
    PAGE_MARGIN,
    CONTENT_WIDTH,
  );
  ctx.y -= 8;

  drawInvoiceItemsTable(ctx, invoiceItems, timeEntries, projects, currency);

  drawSectionHeading(ctx, "Totals");
  drawLabelValueRows(
    ctx,
    [
      { label: "Subtotal", value: formatCurrency(invoice.subtotal, currency) },
      { label: "Tax", value: formatCurrency(invoice.taxAmount, currency) },
      { label: "Discount", value: `-${formatCurrency(invoice.discountAmount, currency)}` },
      { label: "Amount due", value: formatCurrency(invoice.totalAmount, currency) },
    ],
    PAGE_MARGIN,
    260,
  );
  ctx.y -= 8;

  drawDivider(ctx);
  drawSectionHeading(ctx, "Payment terms");
  drawTextBlock(ctx, wrapText(paymentInstructions, ctx.font, FONT_SIZES.body, CONTENT_WIDTH), {
    fontSize: FONT_SIZES.body,
    lineGap: 3,
    color: rgb(0.35, 0.39, 0.44),
  });
  ctx.y -= 8;

  drawSectionHeading(ctx, "Notes");
  drawTextBlock(ctx, wrapText(noteText, ctx.font, FONT_SIZES.body, CONTENT_WIDTH), {
    fontSize: FONT_SIZES.body,
    lineGap: 3,
    color: rgb(0.35, 0.39, 0.44),
  });

  return pdf.save();
}

