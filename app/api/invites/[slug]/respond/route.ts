import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rpcResponse } from '@/lib/api'
import { answerInput } from '@/lib/invite'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const parsed = answerInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('respond_to_invite', { p_slug: slug, p_answer: parsed.data.answer })
  return rpcResponse(data, error)
}
