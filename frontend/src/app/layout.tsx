import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Policy-as-Code Governor',
  description: 'Manage and test access control policies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="header">
          <div className="container">
            <h1>Policy-as-Code Governor</h1>
            <p>Manage and evaluate access control policies</p>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}
