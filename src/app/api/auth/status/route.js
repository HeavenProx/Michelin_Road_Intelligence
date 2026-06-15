import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.tokens && session.athlete) {
    return NextResponse.json({ connected: true, athlete: session.athlete })
  }
  return NextResponse.json({ connected: false })
}
