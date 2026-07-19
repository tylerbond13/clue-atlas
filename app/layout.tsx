import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: {
      default: "Clue Atlas — Personal Knowledge Gym",
      template: "%s · Clue Atlas",
    },
    description:
      "Know more. Know what to learn next. A data-driven trivia and technical learning studio with diagnostic play and spaced repetition.",
    applicationName: "Clue Atlas",
    keywords: [
      "trivia learning",
      "spaced repetition",
      "quiz-show training",
      "knowledge tracking",
      "data science portfolio",
    ],
    openGraph: {
      title: "Clue Atlas",
      description: "Know more. Know what to learn next.",
      type: "website",
      siteName: "Clue Atlas",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "Clue Atlas — Know more. Know what to learn next." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Clue Atlas",
      description: "Know more. Know what to learn next.",
      images: [`${origin}/og.png`],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f0e7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
