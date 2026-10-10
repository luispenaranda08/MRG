import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Mirage } from "@/components/Mirage";
import "./globals.css";

// Las fuentes se descargan en el build y se sirven desde el propio sitio (sin peticiones a Google en el navegador)
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = { title: "Mirage · Costo de capital", description: "Costo de capital sectorial y diagnóstico financiero con fuentes públicas verificables." };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="es-CO" className={`${sans.variable} ${mono.variable}`}><body><Mirage>{children}</Mirage></body></html>; }
