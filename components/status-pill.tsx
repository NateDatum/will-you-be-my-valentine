import { STATUS_STYLE, type DisplayStatus } from '@/lib/invite'

export function StatusPill({ status, small }: { status: DisplayStatus; small?: boolean }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 self-start justify-self-start rounded-full font-semibold ${small ? 'px-2.5 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]'}`} style={{ background: s.bg, color: s.fg }}>
      <span aria-hidden="true" className="size-[7px] rounded-full" style={{ background: s.dot }} />{s.label}
    </span>
  )
}
