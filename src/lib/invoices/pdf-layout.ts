import type { PDFFont, PDFPage, RGB } from "pdf-lib";

export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 34,
  footerHeight: 42,
  headerHeight: 31,
  minTableRowHeight: 43,
  cellPadding: 8,
} as const;

export const PDF_CONTENT_WIDTH = PDF_PAGE.width - PDF_PAGE.margin * 2;

export const PDF_TABLE_COLUMNS = {
  date: { x: PDF_PAGE.margin, width: 58, label: "DATE" },
  time: { x: PDF_PAGE.margin + 58, width: 62, label: "TIME" },
  desc: { x: PDF_PAGE.margin + 120, width: 205, label: "DESCRIPTION" },
  hours: { x: PDF_PAGE.margin + 325, width: 50, label: "HOURS" },
  rate: { x: PDF_PAGE.margin + 375, width: 70, label: "RATE" },
  amount: { x: PDF_PAGE.margin + 445, width: PDF_CONTENT_WIDTH - 445, label: "AMOUNT" },
} as const;

export const PDF_NUMERIC_COLUMN_LABELS = new Set(["HOURS", "RATE", "AMOUNT"]);

export type PdfTextColor = RGB;

export function toPdfText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u20A8/g, "PKR")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\r\n/g, "\n");
}

export function splitLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
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

export function wrapPdfText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
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

export function withVisibleTruncation(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = visibleLines[visibleLines.length - 1] ?? "";
  visibleLines[visibleLines.length - 1] = lastLine.endsWith("...") ? lastLine : `${lastLine}...`;
  return visibleLines;
}

export function getFittedPdfFontSize(
  text: string,
  font: PDFFont,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
) {
  let size = preferredSize;
  const safeText = toPdfText(text);

  while (size > minSize && font.widthOfTextAtSize(safeText, size) > maxWidth) {
    size -= 1;
  }

  return size;
}

export function getPdfTextWidth(text: string, font: PDFFont, fontSize: number) {
  return font.widthOfTextAtSize(toPdfText(text), fontSize);
}

export function drawPdfTextFit({
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
  color: PdfTextColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedPdfFontSize(safeText, font, maxWidth, preferredSize, minSize);
  page.drawText(safeText, { x, y, size, font, color });
  return size;
}

export function drawRightAlignedPdfText({
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
  color: PdfTextColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedPdfFontSize(safeText, font, maxWidth, preferredSize, minSize);
  const width = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: rightX - width, y, size, font, color });
  return size;
}

export function drawCenteredPdfText({
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
  color: PdfTextColor;
}) {
  const safeText = toPdfText(text);
  const size = getFittedPdfFontSize(safeText, font, maxWidth, preferredSize, minSize);
  const width = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: centerX - width / 2, y, size, font, color });
  return size;
}
