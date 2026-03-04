import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name]
  if (raw === undefined) return undefined
  const v = String(raw).trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return undefined
}

export function getMcSessionCookieOptions(input: { maxAgeSeconds: number; isSecureRequest?: boolean }): Partial<ResponseCookie> {
  const secureEnv = envFlag('MC_COOKIE_SECURE')
  const isProd = process.env.NODE_ENV === 'production'
  // In production always use secure cookies. In non-production, allow env/request hints.
  const secure = isProd ? true : (secureEnv ?? input.isSecureRequest ?? false)

  // Strict is safest for this app (same-site UI + API), but allow override for edge cases.
  const sameSiteRaw = (process.env.MC_COOKIE_SAMESITE || 'strict').toLowerCase()
  const sameSite: ResponseCookie['sameSite'] =
    sameSiteRaw === 'lax' ? 'lax' :
    sameSiteRaw === 'none' ? 'none' :
    'strict'

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: input.maxAgeSeconds,
    path: '/',
  }
}
