import type { Element, Root } from 'hast'
import { describe, expect, it } from 'vitest'

import { rehypeCitations } from '@/lib/rehypeCitations'

function paragraph(...children: Element['children']): Root {
  return {
    type: 'root',
    children: [{ type: 'element', tagName: 'p', properties: {}, children }],
  }
}

function runOn(tree: Root): Element {
  rehypeCitations()(tree)
  return tree.children[0] as Element
}

describe('rehypeCitations', () => {
  it('wraps a citation in a sup element and keeps the surrounding text', () => {
    const p = runOn(paragraph({ type: 'text', value: 'Grounded [1] answer.' }))

    expect(p.children).toEqual([
      { type: 'text', value: 'Grounded ' },
      {
        type: 'element',
        tagName: 'sup',
        properties: { className: ['mx-0.5', 'font-medium', 'text-primary'] },
        children: [{ type: 'text', value: '[1]' }],
      },
      { type: 'text', value: ' answer.' },
    ])
  })

  it('wraps every citation in a run of them', () => {
    const p = runOn(paragraph({ type: 'text', value: '[1][2]' }))

    expect(p.children).toHaveLength(2)
    expect(p.children.every(c => c.type === 'element' && c.tagName === 'sup')).toBe(true)
  })

  it('leaves text without citations untouched', () => {
    const p = runOn(paragraph({ type: 'text', value: 'No sources here.' }))

    expect(p.children).toEqual([{ type: 'text', value: 'No sources here.' }])
  })

  it('does not transform citations inside a code element', () => {
    const code: Element = {
      type: 'element',
      tagName: 'code',
      properties: {},
      children: [{ type: 'text', value: 'const a = arr[0]; const b = arr[1]' }],
    }
    
    expect(code.children).toEqual([
      { type: 'text', value: 'const a = arr[0]; const b = arr[1]' },
    ])
  })
})