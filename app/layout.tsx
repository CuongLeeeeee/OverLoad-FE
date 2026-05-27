import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OverLoad - Học lập trình online",
  description: "Nền tảng học lập trình trực tuyến hàng đầu Việt Nam",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
