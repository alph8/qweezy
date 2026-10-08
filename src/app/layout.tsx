import "./globals.css";
import type { Metadata, Viewport } from "next";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Qweezy — Club Tennis Predictions",
  description: "Predict doubles match outcomes against the house spread, playing for points only.",
  applicationName: "Qweezy",
  // When added to an iPhone Home Screen: open full screen, like an app.
  appleWebApp: { capable: true, title: "Qweezy", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2f5233",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw under the notch; the nav bar pads for it
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>
      </body>
    </html>
  );
}
