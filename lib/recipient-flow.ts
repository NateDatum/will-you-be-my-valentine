import type { InviteStatus } from './invite'

export type Screen = 'envelope' | 'opening' | 'card' | 'letterAgain' | 'accepted' | 'decline1' | 'decline2' | 'done' | 'expired'
export type FlowState = { screen: Screen; declines: number; burst: boolean }
export type FlowEvent = { type: 'open' | 'opened' | 'yes' | 'no' | 'reconsider' | 'keepNo' | 'takeCare' | 'readAgain' | 'backToSurprise' | 'changeAnswer' }
type Post = 'accepted' | 'declined' | null

export function initialFlow(status: InviteStatus, expired: boolean): FlowState {
  if (status === 'accepted') return { screen: 'accepted', declines: 0, burst: false }
  if (status === 'declined') return { screen: 'done', declines: 0, burst: true }
  return { screen: expired ? 'expired' : 'envelope', declines: 0, burst: true }
}

// The No count only lives here; only the final answer is ever posted.
export function step(state: FlowState, { type }: FlowEvent): { state: FlowState; post: Post } {
  const to = (patch: Partial<FlowState>, post: Post = null) => ({ state: { ...state, ...patch }, post })
  switch (type) {
    case 'open': return to({ screen: 'opening' })
    case 'opened': return to({ screen: 'card' })
    case 'yes': return to({ screen: 'accepted', burst: true }, 'accepted')
    case 'no': return state.declines >= 1 ? to({ screen: 'decline2', declines: 2 }, 'declined') : to({ screen: 'decline1', declines: 1 })
    case 'reconsider': return to({ screen: 'card' })
    case 'keepNo': return to({ screen: 'decline2', declines: 2 }, 'declined')
    case 'takeCare': return to({ screen: 'done' })
    case 'readAgain': return to({ screen: 'letterAgain' })
    case 'backToSurprise': return to({ screen: 'accepted', burst: false })
    case 'changeAnswer': return to({ screen: 'card', declines: 0, burst: true })
  }
}
