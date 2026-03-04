'use client'

import { useEffect } from 'react'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return String(init.method).toUpperCase()
  if (input instanceof Request) return String(input.method || 'GET').toUpperCase()
  return 'GET'
}

function resolveUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) return new URL(input.toString(), window.location.origin)
    if (input instanceof Request) return new URL(input.url, window.location.origin)
    return new URL(String(input), window.location.origin)
  } catch {
    return null
  }
}

export function CsrfFetchBootstrap() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window)

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const method = resolveMethod(input, init)
      if (!MUTATING_METHODS.has(method)) {
        return nativeFetch(input, init)
      }

      const targetUrl = resolveUrl(input)
      if (!targetUrl || targetUrl.origin !== window.location.origin) {
        return nativeFetch(input, init)
      }

      const token = readCookie('mc-csrf')
      if (!token) {
        return nativeFetch(input, init)
      }

      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
      if (!headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', token)
      }

      return nativeFetch(input, { ...init, headers })
    }) as typeof window.fetch

    return () => {
      window.fetch = nativeFetch
    }
  }, [])

  return null
}

