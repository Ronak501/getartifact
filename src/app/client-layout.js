'use client'

import { useEffect } from 'react'
import Navbar from '@components/layout/Navbar'
import Footer from '@components/layout/Footer'
import useAuthStore from '@store/authStore'

export default function ClientLayout({ children }) {
  const init = useAuthStore(s => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <>
      <Navbar />
      <div className="h-16 flex-shrink-0" />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </>
  )
}
