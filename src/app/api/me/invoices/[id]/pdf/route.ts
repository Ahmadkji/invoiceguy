import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { buildInvoicePdfBuffer } from "@/lib/invoices/pdf";
import { loadInvoiceDetailData } from "@/lib/invoices/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { supabase, withCookies } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  const detailResult = await loadInvoiceDetailData({
    supabase,
    user,
    invoiceId: id,
  });

  if (!detailResult.ok) {
    return NextResponse.json(
      { ok: false, code: detailResult.code, message: detailResult.message },
      { status: detailResult.status },
    );
  }

  const pdfBytes = await buildInvoicePdfBuffer(detailResult.value);
  const safeInvoiceNumber = detailResult.value.invoice.invoiceNumber.replace(/[^a-zA-Z0-9._-]+/g, "-") || "invoice";

  return withCookies(
    new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${safeInvoiceNumber}.pdf\"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    }),
  );
}
