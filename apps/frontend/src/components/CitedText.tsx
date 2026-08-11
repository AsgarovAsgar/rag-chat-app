import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { rehypeCitations } from '@/lib/rehypeCitations'
import { rehypeStreamWords } from '@/lib/rehypeStreamWords'

const STATIC_PLUGINS = [rehypeCitations]
const STREAMING_PLUGINS = [rehypeCitations, rehypeStreamWords]

export function CitedText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={streaming ? STREAMING_PLUGINS : STATIC_PLUGINS}
    >
      {text}
    </Markdown>
  )
}
