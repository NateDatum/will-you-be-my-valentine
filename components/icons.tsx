type P = { size?: number; className?: string }
const HEART = 'M12 20.5C7 16.8 3 13.6 3 9.4 3 6.6 5.1 4.5 7.8 4.5c1.7 0 3.2.9 4.2 2.3 1-1.4 2.5-2.3 4.2-2.3 2.7 0 4.8 2.1 4.8 4.9 0 4.2-4 7.4-9 11.1z'

export const HeartIcon = ({ size = 24, fill = '#E85D75', className }: P & { fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}><path d={HEART} fill={fill} /></svg>
)

const stroke = (d: React.ReactNode, w = 2) =>
  function Icon({ size = 18, className }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
        {d}
      </svg>
    )
  }
export const EnvelopeIcon = stroke(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>)
export const CalendarIcon = stroke(<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>)
export const CopyIcon = stroke(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>)
export const CheckIcon = stroke(<path d="M5 12.5l4.5 4.5L19 7.5" />, 2.2)
export const EyeIcon = stroke(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>)
export const ClockIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const XIcon = stroke(<path d="M6 6l12 12M18 6L6 18" />, 2.2)
export const XCircleIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>)
export const PlusIcon = stroke(<path d="M12 5v14M5 12h14" />, 2.2)
export const ArrowLeftIcon = stroke(<path d="M19 12H5M11 6l-6 6 6 6" />)
export const SendIcon = stroke(<path d="M4 12l16-8-6 16-2.5-6.5z" />)
export const InfoIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>)
export const HeartOutlineIcon = stroke(<path d={HEART} />)

export const LogoMark = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
    <rect x="3" y="8" width="30" height="21" rx="5" fill="#FFF0F3" stroke="#702D43" strokeWidth="1.6" />
    <path d="M4.5 10.5L18 20l13.5-9.5" fill="none" stroke="#702D43" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="18" cy="21" r="6.5" fill="#E85D75" />
    <path d="M18 24.6c-2-1.5-3.4-2.7-3.4-4.2 0-1.1.8-1.9 1.8-1.9.7 0 1.2.4 1.6.9.4-.5.9-.9 1.6-.9 1 0 1.8.8 1.8 1.9 0 1.5-1.4 2.7-3.4 4.2z" fill="#FFFFFF" />
  </svg>
)

export const FlowerDecor = ({ size = 110, petal = '#F9CED8', center = '#FFD8C2', dot, className, style }: {
  size?: number; petal?: string; center?: string; dot?: string; className?: string; style?: React.CSSProperties
}) => (
  <svg width={size} height={size} viewBox="0 0 110 110" aria-hidden="true" className={className} style={style}>
    <circle cx="55" cy="55" r="16" fill={center} />
    <circle cx="55" cy="28" r="15" fill={petal} /><circle cx="82" cy="55" r="15" fill={petal} />
    <circle cx="55" cy="82" r="15" fill={petal} /><circle cx="28" cy="55" r="15" fill={petal} />
    {dot && <circle cx="55" cy="55" r="7" fill={dot} />}
  </svg>
)

/** design/Recipient.dc.html line 127 (yes) and 170 (no). */
export const Bouquet = ({ variant, width, height }: { variant: 'yes' | 'no'; width: number; height: number }) => {
  const c = variant === 'yes'
    ? { top: '#E85D75', l: '#F4A3B4', r: '#F4A3B4', ll: '#C9B3E6', rr: '#FFC4A6', wrap: '#FFF9F2', bow: '#E85D75' }
    : { top: '#FFC4A6', l: '#C9B3E6', r: '#F4A3B4', ll: '#F4A3B4', rr: '#C9B3E6', wrap: '#E9DDF8', bow: '#FFD8C2' }
  return (
    <svg width={width} height={height} viewBox="0 0 160 180" aria-hidden="true">
      <path d="M80 150L60 77M80 150L80 65M80 150L100 77M80 150L42 97M80 150L118 99" stroke="#5B8C72" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="66" cy="112" rx="5" ry="12" transform="rotate(-35 66 112)" fill="#8DB59D" />
      <ellipse cx="95" cy="112" rx="5" ry="12" transform="rotate(35 95 112)" fill="#8DB59D" />
      <path d="M68 58C68 42 74 36 74 36L80 46L86 36C86 36 92 42 92 58C92 68 68 68 68 58Z" fill={c.top} />
      <path d="M48 70C48 54 54 48 54 48L60 58L66 48C66 48 72 54 72 70C72 80 48 80 48 70Z" fill={c.l} />
      <path d="M88 70C88 54 94 48 94 48L100 58L106 48C106 48 112 54 112 70C112 80 88 80 88 70Z" fill={c.r} />
      <path d="M32 90C32 77 37 72 37 72L42 80L47 72C47 72 52 77 52 90C52 98 32 98 32 90Z" fill={c.ll} />
      <path d="M108 92C108 79 113 74 113 74L118 82L123 74C123 74 128 79 128 92C128 100 108 100 108 92Z" fill={c.rr} />
      <path d="M40 112L80 172L120 112Z" fill={c.wrap} stroke="#702D43" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 128C68 118 62 134 80 131C98 134 92 118 80 128Z" fill={c.bow} {...(variant === 'no' ? { stroke: '#702D43', strokeWidth: 1.5 } : {})} />
      {variant === 'yes' && <path d="M80 130L72 146M80 130L88 146" stroke="#E85D75" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  )
}
