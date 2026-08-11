import type { ElementContent, Root } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Wraps each word in a <span> so it can fade in as it streams.
 *
 * Runs after rehypeCitations, so citation <sup>s are already elements and are
 * skipped by the 'text' visitor. Splitting here rather than in React keeps
 * markdown structure intact — bold spans, list items and code blocks are parsed
 * before any word is touched.
 */
export function rehypeStreamWords() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined) return
      if (parent.type === 'element' && (parent.tagName === 'code' || parent.tagName === 'pre')) return

      // Keep the whitespace in the output: splitting on a captured group means
      // the separators survive, so `white-space` and inline layout are unchanged.
      const parts = node.value.split(/(\s+)/g).filter(part => part !== '')
      if (parts.length === 0) return

      const nodes: ElementContent[] = parts.map(part =>
        /^\s+$/.test(part)
          ? { type: 'text', value: part }
          : {
              type: 'element',
              tagName: 'span',
              properties: { className: ['stream-word'] },
              children: [{ type: 'text', value: part }],
            }
      )

      parent.children.splice(index, 1, ...nodes)
      return index + nodes.length
    })
  }
}
