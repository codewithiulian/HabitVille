import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Habitville",
  description: "Build your city by building your habits",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logo/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/logo/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/assets/logo/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1a5c1a" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen overflow-hidden bg-[#1a5c1a]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
