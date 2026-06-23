import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import { Suspense } from "react";
import { NavigationMotion } from "@/components/layout/navigation-motion";
import "./globals.css";

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-anuphan",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NAK Wholesale",
  description: "ขายส่งครบ จบในที่เดียว — สั่งสินค้า ติดตามออเดอร์ และจัดการเครดิตในที่เดียว",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdeef1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" data-scroll-behavior="smooth" className={`${anuphan.variable} h-full`}>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <NavigationMotion />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
