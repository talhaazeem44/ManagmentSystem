import type { Metadata } from "next";
import "./globals.css";
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: "Naeem Autos",
  description: "Naeem Autos Dealership Management System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/bike-icon.gif' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Naeem Autos",
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
        {/* Sets the theme attribute before React hydrates/paints, so there's no flash of the
            wrong theme. Reads the user's saved choice, defaulting to light rather than OS
            preference — the dark glass styling reads as "black theme" to most users here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/bike-icon.gif" type="image/gif" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#cc1111" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Naeem Autos" />
        {/* apple-touch-icon is emitted automatically from metadata.icons.apple above */}
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
