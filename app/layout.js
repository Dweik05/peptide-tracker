import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataBase makes relative URLs (and the auto-detected OG image, if you add
// app/opengraph-image.png later) resolve to absolute URLs. It reads your real
// domain from NEXT_PUBLIC_SITE_URL when set, and falls back to the Vercel URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://peptide-tracker-beta.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Peptide Tracker — Track Doses, Inventory & Protocols",
    template: "%s · Peptide Tracker",
  },
  description:
    "Log peptide doses, manage vial inventory, plan protocols with reconstitution math, and track weight, labs, and side effects — with reminders to stay on schedule.",
  applicationName: "Peptide Tracker",
  keywords: [
    "peptide tracker",
    "peptide dosing",
    "peptide protocol planner",
    "reconstitution calculator",
    "injection site rotation",
    "peptide inventory",
  ],
  openGraph: {
    type: "website",
    siteName: "Peptide Tracker",
    url: "/",
    title: "Peptide Tracker — Track your peptide protocols, inventory & progress",
    description:
      "Log doses, manage vial inventory, plan protocols with reconstitution math, and track your progress — all in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peptide Tracker",
    description:
      "Log doses, manage vial inventory, plan protocols, and track your progress — all in one place.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Sets the mobile browser's address-bar color to match the app's dark theme.
export const viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}