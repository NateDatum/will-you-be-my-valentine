import { ImageResponse } from 'next/og'

export const alt = 'Someone has a question for you'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, background: '#FFF0F3' }}>
        <div style={{ width: 420, height: 280, borderRadius: 28, background: '#F7D3DB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px rgba(112,45,67,.18)' }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: '#C94462', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 52 }}>♥</div>
        </div>
        <div style={{ fontSize: 60, color: '#702D43', fontWeight: 700 }}>Someone has a question for you</div>
      </div>
    ),
    size,
  )
}
