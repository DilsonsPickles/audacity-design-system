import type { Metadata } from "next";
import "@audacity-ui/components/style.css";

export const metadata: Metadata = {
  title: "Spectrogram Demo",
  description: "Audio spectrogram visualization demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
