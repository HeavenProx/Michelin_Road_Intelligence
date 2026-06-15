export const metadata = {
  title: 'Michelin Road Intelligence',
  description: 'Recommandation de pneu vélo personnalisée',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "'Segoe UI', sans-serif", background: '#1a1a1a', color: '#f0f0f0' }}>
        {children}
      </body>
    </html>
  )
}
