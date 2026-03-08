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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#89CFF0" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('habitville-theme');if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className="min-h-screen overflow-hidden" suppressHydrationWarning>
        <div
          id="splash-screen"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "linear-gradient(180deg, #89CFF0 0%, #5DADE2 40%, #3498DB 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.4s ease-out",
          }}
        >
          <picture style={{ width: "100%", height: "100%" }}>
            <source
              srcSet="/assets/cover/cover-portrait.png"
              media="(orientation: portrait)"
            />
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
          </picture>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              id="loading-progress"
              style={{
                height: "100%",
                width: "0%",
                background: "rgba(255, 255, 255, 0.8)",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
