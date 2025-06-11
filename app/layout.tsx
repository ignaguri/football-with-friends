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
    template: "%s | Football With Friends",
    default: "Football With Friends",
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
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
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
