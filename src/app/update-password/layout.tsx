import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "Update Password",
  "Update your password for the private TimeProof workspace.",
  "/update-password",
  true,
);

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
