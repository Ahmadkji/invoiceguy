import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
import { buildOrganizationJsonLd, buildRootMetadata, buildWebsiteJsonLd } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
