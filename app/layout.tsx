import './globals.css';

export const metadata = {
  title: 'REDZONE',
  description: 'NFL Pick\'em App',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
