import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FTM Studio",
  description: "Offline post generator for the Follow the Money page.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-navy-950 text-navy-50 antialiased">{children}</body>
    </html>
  );
}
