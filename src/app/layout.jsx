import "./globals.css";

export const metadata = {
  title: "Elta Variedades — Sistema de Gerenciamento",
  description: "Sistema moderno de gerenciamento da Elta Variedades",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elta Variedades",
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
      <body>{children}</body>
    </html>
  );
}
