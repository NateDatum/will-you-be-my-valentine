import { NextResponse } from 'next/server'

export function rpcResponse(result: unknown, error: unknown) {
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })
  if (result === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (result === 'expired') return NextResponse.json({ error: 'expired' }, { status: 410 })
  return NextResponse.json({ status: result })
}
