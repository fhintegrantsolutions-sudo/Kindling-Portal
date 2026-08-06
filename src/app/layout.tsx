import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "The operating platform behind a modern note experience — secure note administration for the CoSpark community.";

export const metadata: Metadata = {
  // Makes the auto-generated opengraph-image URL absolute in link previews.
  metadataBase: new URL("https://kindling.network"),
  title: {
    default: "Kindling",
    template: "%s · Kindling",
  },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Kindling",
    url: "https://kindling.network",
    title: "Kindling",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kindling",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${libreBaskerville.variable} h-full`}
      // Browser extensions (screen recorders, wallets) stamp attributes onto
      // <html> before React hydrates. Scoped to this element only — it does
      // not cascade, so real hydration mismatches still surface everywhere else.
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
