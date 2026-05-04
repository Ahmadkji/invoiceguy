import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "Sign In",
  "Secure sign-in for the private TimeProof workspace.",
  "/signin",
  true,
);

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
