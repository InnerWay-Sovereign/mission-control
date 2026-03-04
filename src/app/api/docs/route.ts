import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { requireRole } from '@/lib/auth'

let cachedSpec: string | null = null

export async function GET(request: Request) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!cachedSpec) {
    const specPath = join(process.cwd(), 'openapi.json')
    cachedSpec = readFileSync(specPath, 'utf-8')
  }

  return new NextResponse(cachedSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  })
}
