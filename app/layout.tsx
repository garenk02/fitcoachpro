import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "FitCoach PWA",
  description: "Personal trainer management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}