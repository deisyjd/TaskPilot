import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wipli",
  description: "Gestión de clientes, publicaciones y operación semanal",
  icons: {
    icon: [{ url: "/wipli-icon.png", type: "image/png" }],
    apple: [{ url: "/wipli-icon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sora.variable} ${jakarta.variable} h-full`}>
      <body className="h-full" style={{ backgroundColor: "var(--tp-bg)" }}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
