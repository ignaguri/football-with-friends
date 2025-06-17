import "./globals.css";
import { Montserrat, Fira_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Wrapper, WrapperWithQuery } from "@/components/wrapper";
import { createMetadata } from "@/lib/metadata";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });
const firaMono = Fira_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = createMetadata({
  title: {
    template: "%s | Fútbol con los pibes",
    default: "Fútbol con los pibes",
  },
  description:
    "Organize, join, and manage your football matches with Google Sheets as the backend.",
  metadataBase: new URL("https://football-with-friends.vercel.app"),
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta
          name="apple-mobile-web-app-title"
          content="Futbol con los pibes"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon.png"
          sizes="180x180"
          type="image/png"
        />
        <link rel="icon" href="/icon1.png" sizes="96x96" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${montserrat.variable} ${firaMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <Wrapper>
            <WrapperWithQuery>{children}</WrapperWithQuery>
          </Wrapper>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
