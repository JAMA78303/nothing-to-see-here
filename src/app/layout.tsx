import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Patrick_Hand, Special_Elite } from "next/font/google";
import "./globals.css";
import "../game/game.css";

const specialElite = Special_Elite({ variable: "--font-special-elite", weight: "400", subsets: ["latin"] });
const patrickHand = Patrick_Hand({ variable: "--font-patrick-hand", weight: "400", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: "Nothing To See Here",
  description: "A suspicious man under a streetlamp. Most of the time, nothing happens.",
  applicationName: "Nothing To See Here",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Nothing To See Here",
    description: "A suspicious man under a streetlamp. Most of the time, nothing happens.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Nothing To See Here" },
};

export const viewport: Viewport = {
  themeColor: "#121826",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${specialElite.variable} ${patrickHand.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
