import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pomodoro Timer - Focus & Productivity",
  description: "A beautiful Pomodoro timer to boost your productivity. Track focus sessions, take breaks, and stay productive.",
  keywords: ["pomodoro", "timer", "productivity", "focus", "pomodoro technique"],
  authors: [{ name: "Pomodoro Timer" }],
  manifest: "./manifest.json",
  icons: {
    icon: [
      { url: "favicon.svg", type: "image/svg+xml" },
      { url: "favicon.png", type: "image/png" },
      { url: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pomodoro",
  },
  openGraph: {
    title: "Pomodoro Timer",
    description: "Boost your productivity with the Pomodoro technique",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="./manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
