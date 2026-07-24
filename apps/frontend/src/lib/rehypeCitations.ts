import type { ElementContent, Root } from 'hast'
import { visit } from 'unist-util-visit'

export function rehypeCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined) return
      if (parent.type === 'element' && parent.tagName === 'code') return
      if (!/\[\d+\]/.test(node.value)) return

      const parts = node.value.split(/(\[\d+\])/g)

      const nodes: ElementContent[] = parts
        .filter(part => part !== '')
        .map(part =>
          /^\[\d+\]$/.test(part)
            ? {
                type: 'element',
                tagName: 'sup',
                properties: { className: ['mx-0.5', 'font-medium', 'text-primary'] },
                children: [{ type: 'text', value: part }],
              }
            : { type: 'text', value: part }
        )

      parent.children.splice(index, 1, ...nodes)
      return index + nodes.length
    })
  }
}