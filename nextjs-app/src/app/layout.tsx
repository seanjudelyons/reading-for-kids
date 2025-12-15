import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newton's Apple - Learn to Read & Write",
  description: "A fun reading and writing app for children",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
