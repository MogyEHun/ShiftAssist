import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { CookieConsent } from "@/components/CookieConsent";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { getLocale } from "@/lib/i18n";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ShiftAssist – Vendéglátós beosztáskezelő",
  description: "Egyszerű és hatékony műszakkezelés vendéglátós vállalkozásoknak.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShiftAssist",
  },
  icons: {
    apple: "/api/icon/192",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a5c3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getLocale()
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider initialLocale={locale}>
          {children}
          <ServiceWorkerRegistration />
          <InstallBanner />
          <CookieConsent />
        </LanguageProvider>
      </body>
    </html>
  );
}
