"use client"

import NextLink from 'next/link'
import { useRouter, usePathname, useSearchParams as useNextSearchParams } from 'next/navigation'

export function Link({ to, href, children, className, ...props }) {
  return (
    <NextLink href={to || href} className={className} {...props}>
      {children}
    </NextLink>
  )
}

export function useNavigate() {
  const router = useRouter()
  return (to) => router.push(to)
}

export function useLocation() {
  const pathname = usePathname()
  const searchParams = useNextSearchParams()
  return {
    pathname,
    search: searchParams ? `?${searchParams.toString()}` : '',
  }
}

export function useSearchParams() {
  const searchParams = useNextSearchParams()
  return [searchParams]
}
