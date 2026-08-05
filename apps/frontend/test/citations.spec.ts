import { describe, expect, it } from 'vitest'

import { extractCitations } from '@/lib/citations'

describe('extractCitations', () => {
  it('pulls every citation number out of the text', () => {
    expect(extractCitations('See [1] and also [3].')).toEqual(new Set([1, 3]))
  })

  it('deduplicates a source cited more than once', () => {
    expect(extractCitations('[2] says this, and [2] also says that.')).toEqual(new Set([2]))
  })

  it('returns an empty set when nothing is cited', () => {
    expect(extractCitations('A plain answer with no sources.')).toEqual(new Set())
  })

  it('handles multi-digit and adjacent citations', () => {
    expect(extractCitations('[9][10][11]')).toEqual(new Set([9, 10, 11]))
  })

  it('ignores bracketed text that is not a number', () => {
    expect(extractCitations('[note] and [1a] and [] but [4] counts')).toEqual(new Set([4]))
  })
})