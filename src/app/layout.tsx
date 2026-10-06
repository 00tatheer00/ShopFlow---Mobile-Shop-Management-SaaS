import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://shopflow.pk"),
  title: {
    default: "ShopFlow — Mobile Shop Management SaaS",
    template: "%s | ShopFlow",
  },
  description:
    "Simple, powerful cloud-based management system for Pakistani mobile phone shops. Track sales, inventory, IMEI, Udhaar, and daily cash reconciliation.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ShopFlow — Mobile Shop Management SaaS",
    description: "Cloud-based POS, inventory, IMEI tracking, and Udhaar management tailored for Pakistani mobile shops.",
    url: "/",
    siteName: "ShopFlow",
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopFlow — Mobile Shop Management SaaS",
    description: "Cloud-based POS, inventory, IMEI tracking, and Udhaar management.",
  },
  keywords: [
    "mobile shop management",
    "POS system",
    "inventory management",
    "IMEI tracking",
    "udhaar management",
    "Pakistan",
    "Lahore",
    "Karachi",
    "Peshawar",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
