import "./globals.css";

export const metadata = {
  title: "Elta Variedades — Sistema de Gerenciamento",
  description: "Sistema moderno de gerenciamento da Elta Variedades",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
