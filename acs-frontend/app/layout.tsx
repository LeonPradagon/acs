import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

// Ambil logo & nama dari env
const appLogo = process.env.NEXT_PUBLIC_APP_LOGO || "/images/Asisgo.png";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "ASISGO CORE-SOVEREIGN";

export const metadata: Metadata = {
  title: appName,
  description: "Analyst Workspace Platform",
  icons: {
    icon: appLogo, // favicon di tab browser
    shortcut: appLogo,
    apple: appLogo,
  },
  openGraph: {
    title: appName,
    description: "Analyst Workspace Platform",
    images: [appLogo],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
