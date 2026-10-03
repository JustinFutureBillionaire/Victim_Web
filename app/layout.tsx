import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo Helpdesk — Support",
  description: "Fictional, deliberately vulnerable helpdesk used as a security demo target.",
};

function Logo() {
  return (
    <span className="logo" aria-hidden>
      <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
        <path d="M9 12a7 5 0 0 1 14 0v4a7 5 0 0 1-7 5l-5 3v-3.6A5 4 0 0 1 9 16z" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <Logo />
            <span>
              Demo Helpdesk <small>Support</small>
            </span>
          </Link>
          <nav className="topnav">
            <Link href="/">Help center</Link>
            <Link href="/admin">Agent console</Link>
          </nav>
          <span className="spacer" />
          <span className="userchip">
            <span className="avatar" aria-hidden>
              SJ
            </span>
            Sam Jordan
          </span>
        </header>

        <main className="main">{children}</main>

        <footer className="footer">
          <strong>Demo Helpdesk</strong> is a fictional application built for a security demonstration. All
          customers, tickets, and tokens shown here are fabricated.
        </footer>
      </body>
    </html>
  );
}
