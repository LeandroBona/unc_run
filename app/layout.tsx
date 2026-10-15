import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corrida para a Aula | UNC em Movimento",
  description: "Um jogo da UNC com fases que os alunos podem editar em HTML, CSS e JavaScript.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
