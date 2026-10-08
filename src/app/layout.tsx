import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import { Toaster } from "sonner";
import { PwaManager } from "@/components/pwa/pwa-manager";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoNastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://shopflow.pk"),
  applicationName: "ShopFlow",
  title: {
    default: "ShopFlow — Mobile Shop Management SaaS",
    template: "%s | ShopFlow",
  },
  description:
    "Simple, powerful cloud-based management system for Pakistani mobile phone shops. Track sales, inventory, IMEI, Udhaar, and daily cash reconciliation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShopFlow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    <html lang="en" className={`${inter.variable} ${notoNastaliq.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ShopFlow" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <PwaManager />
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
