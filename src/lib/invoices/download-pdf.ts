function buildDownloadFilename(invoiceNumber?: string) {
  const safeInvoiceNumber = (invoiceNumber || "invoice")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeInvoiceNumber || "invoice"}.pdf`;
}

type DownloadInvoicePdfOptions = {
  invoiceId: string;
  invoiceNumber?: string;
};

export async function downloadInvoicePdf({ invoiceId, invoiceNumber }: DownloadInvoicePdfOptions) {
  const response = await fetch(`/api/me/invoices/${invoiceId}/pdf`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? "Unable to download invoice PDF.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildDownloadFilename(invoiceNumber);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

