import "./globals.css";

export const metadata = {
  title: "Loja Joselane — Sistema de Gerenciamento",
  description: "Sistema moderno de gerenciamento de loja de roupas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
