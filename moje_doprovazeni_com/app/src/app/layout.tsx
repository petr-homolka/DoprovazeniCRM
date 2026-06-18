import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FosterFlow",
  description: "Google Workspace - CRM a ERP systém pro pěstounskou péči",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
