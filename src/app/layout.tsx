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
        <meta name="theme-color" content="#0f2a4a" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen overflow-hidden bg-[#0f2a4a]" suppressHydrationWarning>
        <div
          id="splash-screen"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0f2a4a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.4s ease-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/cover/cover.png"
            alt="HabitVille"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
