import { buildLlmsFullTxt } from "@/lib/seo";

export function GET() {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
