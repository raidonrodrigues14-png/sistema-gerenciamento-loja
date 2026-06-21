import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata = {
  title: "Elta Variedades — Sistema de Gerenciamento",
  description: "Sistema moderno de gerenciamento da Elta Variedades",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elta Variedades",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#16140f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
