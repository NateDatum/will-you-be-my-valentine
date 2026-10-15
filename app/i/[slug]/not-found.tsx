import { EnvelopeIcon } from '@/components/icons'

export default function LostLetter() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-blush px-8 text-center">
      <span className="text-rose"><EnvelopeIcon size={48} /></span>
      <h1 className="m-0 font-display text-[30px] font-semibold text-wine">This letter got lost in the mail</h1>
      <p className="m-0 max-w-[300px] text-muted">The link may be mistyped. Ask the sender to share it again.</p>
    </main>
  )
}
