import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "Reset Password",
  "Reset access to your private TimeProof account.",
  "/forgot-password",
  true,
);

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
