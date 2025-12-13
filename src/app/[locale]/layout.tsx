import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import { routing } from "@/i18n/routing";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { AuthProvider } from "@/contexts/AuthContext";
import { PusherProvider } from "@/contexts/PusherContext";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";

// Bebas Neue for headings - bold, athletic, high-energy
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

// Source Sans 3 (formerly Source Sans Pro) for body text - clean, professional
const sourceSans = Source_Sans_3({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "CoachMe by Ecotofitness - Transform Your Fitness Journey",
  description:
    "Connect with certified fitness coaches who will guide you to achieve your goals. Find personal trainers, yoga instructors, and wellness coaches.",
  keywords:
    "fitness, personal training, coaching, wellness, health, CoachMe, Ecotofitness",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as "en" | "fr")) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${bebasNeue.variable} ${sourceSans.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <PusherProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster position="top-center" />
            </PusherProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
