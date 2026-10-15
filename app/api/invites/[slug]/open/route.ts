import { createClient } from '@/lib/supabase/server'
import { rpcResponse } from '@/lib/api'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('mark_invite_opened', { p_slug: slug })
  return rpcResponse(data, error)
}
