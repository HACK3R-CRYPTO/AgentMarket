import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgentMarket - AI Agent Marketplace",
  description: "Buy AI agents. Use AI agents. Pay per use. On-chain verification.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // Get the cookie header string - format as "name=value; name2=value2"
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ') || null;
  
  return (
    <html lang="en">
      <body>
        <Providers cookies={cookieHeader}>{children}</Providers>
      </body>
    </html>
  );
}
