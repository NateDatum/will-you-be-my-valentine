import { describe, expect, it } from 'vitest'
import { initialFlow, step, type FlowEvent, type FlowState } from './recipient-flow'

const run = (s: FlowState, ...types: FlowEvent['type'][]) => {
  const posts: string[] = []
  for (const type of types) { const r = step(s, { type }); s = r.state; if (r.post) posts.push(r.post) }
  return { s, posts }
}
const fresh = initialFlow('sent', false)

describe('initialFlow', () => {
  it('starts at the envelope for unanswered invites', () => {
    expect(fresh).toEqual({ screen: 'envelope', declines: 0, burst: true })
    expect(initialFlow('opened', false).screen).toBe('envelope')
  })
  it('shows expired only for unanswered invites past expiry', () => {
    expect(initialFlow('opened', true).screen).toBe('expired')
  })
  it('revisits answered invites even after expiry', () => {
    expect(initialFlow('accepted', true)).toEqual({ screen: 'accepted', declines: 0, burst: false })
    expect(initialFlow('declined', true).screen).toBe('done')
  })
})

describe('step', () => {
  it('opens the envelope into the card', () => {
    expect(run(fresh, 'open').s.screen).toBe('opening')
    expect(run(fresh, 'open', 'opened').s.screen).toBe('card')
  })
  it('Yes posts accepted with confetti', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'yes')
    expect(s).toEqual({ screen: 'accepted', declines: 0, burst: true })
    expect(posts).toEqual(['accepted'])
  })
  it('first No asks once and posts nothing', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no')
    expect(s.screen).toBe('decline1')
    expect(posts).toEqual([])
  })
  it('"Yes, I’m sure" ends with the bouquet and posts declined', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no', 'keepNo')
    expect(s.screen).toBe('decline2')
    expect(posts).toEqual(['declined'])
  })
  it('a second No from the card also ends — never a third ask', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no', 'reconsider', 'no')
    expect(s.screen).toBe('decline2')
    expect(posts).toEqual(['declined'])
  })
  it('reconsider then Yes posts only accepted', () => {
    expect(run(fresh, 'open', 'opened', 'no', 'reconsider', 'yes').posts).toEqual(['accepted'])
  })
  it('bouquet → take care → done', () => {
    expect(run(fresh, 'open', 'opened', 'no', 'keepNo', 'takeCare').s.screen).toBe('done')
  })
  it('read again and back to the surprise without re-posting or re-bursting', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'yes', 'readAgain', 'backToSurprise')
    expect(s).toEqual({ screen: 'accepted', declines: 0, burst: false })
    expect(posts).toEqual(['accepted'])
  })
  it('change my answer returns to the card with a fresh No count', () => {
    const { s } = run(initialFlow('declined', false), 'changeAnswer')
    expect(s).toEqual({ screen: 'card', declines: 0, burst: true })
    expect(run(s, 'no').s.screen).toBe('decline1')
  })
})
