import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Career Platform",
  description: "AI-powered career planning and consultation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href="/">
              <span className="brand-mark">CP</span>
              Career Platform
            </Link>
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/chat">AI Chat</Link>
              <Link href="/resumes">Resumes</Link>
              <Link href="/consultations">Consultations</Link>
              <Link className="nav-cta" href="/login">Login</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
