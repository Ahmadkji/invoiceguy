import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "Create Account",
  "Create a private TimeProof account for hourly invoicing workflows.",
  "/signup",
  true,
);

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
