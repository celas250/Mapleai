import "../styles/globals.css";
import React from "react";

export const metadata = {
  title: "MapleMind",
  description: "A personalized AI study companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <header className="border-b bg-white shadow-sm">
            <div className="mx-auto max-w-4xl px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">MapleMind</h1>
                <nav>
                  <a className="text-sm text-slate-600" href="/auth">Log in</a>
                </nav>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-4xl p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
