import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { rehypeCitations } from '@/lib/rehypeCitations'

export function CitedText({ text }: { text: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeCitations]}>
      {text}
    </Markdown>
  )
}