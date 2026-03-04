import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>{children}</body>
    </html>
  );
}
