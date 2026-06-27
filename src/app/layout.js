import '../index.css'
import ClientLayout from './client-layout'

export const metadata = {
  title: 'Getartifact AI Website Builder',
  description: 'AI-powered 3D website builder: Prompt → Blueprint → React + Three.js Code',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a14] text-white min-h-screen flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
