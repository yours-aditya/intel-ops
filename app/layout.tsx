import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelOps — Intelligence Console",
  description: "AI-powered operations intelligence and telemetry analytics",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
