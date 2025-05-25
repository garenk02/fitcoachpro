import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { OfflineProvider } from "@/components/offline-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { PWAInstallPromptWrapper } from "@/components/pwa-install-prompt-wrapper";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AnalyticsWrapper } from "@/components/analytics-wrapper";
import { DoubleBackExit } from "@/components/double-back-exit";

// Load Inter font (Primary Font - Section 2.1)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  display: "swap"
});

// Load Poppins font (Secondary Font - Section 2.1)
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "700"],
  display: "swap"
});

export const viewport: Viewport = {
  themeColor: "#1F2A44",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "FitCoachPro - The ultimate platform for personal trainers",
  description: "The ultimate platform for personal trainers. Everything You Need to Manage Your Training Business",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FitCoachPro",
    startupImage: [
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      },
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      },
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      },
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      },
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      }
    ]
  },
  formatDetection: {
    telephone: false,
  },
  applicationName: "FitCoachPro",
  keywords: ["fitness", "personal trainer", "workout", "training", "clients", "schedule"],
  authors: [{ name: "FitCoachPro Team" }],
  creator: "FitCoachPro",
  publisher: "FitCoachPro",
  metadataBase: new URL("https://fitcoachpro.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fitcoachpro.vercel.app",
    title: "FitCoachPro - The ultimate platform for personal trainers",
    description: "The ultimate platform for personal trainers. Everything You Need to Manage Your Training Business",
    siteName: "FitCoachPro",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "FitCoachPro - The ultimate platform for personal trainers"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "FitCoachPro - The ultimate platform for personal trainers",
    description: "The ultimate platform for personal trainers. Everything You Need to Manage Your Training Business",
    images: ["/logo.png"]
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon.ico" }
    ],
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
        <script dangerouslySetInnerHTML={{
          __html: `
            // Clear problematic caches on page load
            if ('caches' in window) {
              caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                  if (cacheName.includes('workbox-precache')) {
                    caches.open(cacheName).then(cache => {
                      cache.keys().then(requests => {
                        requests.forEach(request => {
                          if (request.url.includes('app-build-manifest.json')) {
                            cache.delete(request);
                            console.log('Deleted problematic cache entry:', request.url);
                          }
                        });
                      });
                    });
                  }
                });
              });
            }
          `
        }} />
        <script src="/register-sw.js" defer></script>
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          poppins.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OfflineProvider>
              {children}
              <AnalyticsWrapper />
              <Toaster />
              <PWAInstallPromptWrapper />
              <ServiceWorkerRegistration />
              <DoubleBackExit />
            </OfflineProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}