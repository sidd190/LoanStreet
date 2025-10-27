import './globals.css'
import { Inter, Poppins } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins'
})

export const metadata = {
  title: 'QuickLoan - Fast & Secure Loans in India',
  description: 'Get instant personal loans with minimal documentation. Quick approval, competitive rates, and hassle-free process.',
  keywords: 'personal loans, business loans, home loans, quick loans, instant approval, India',
  authors: [{ name: 'QuickLoan Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} ${poppins.variable} antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}