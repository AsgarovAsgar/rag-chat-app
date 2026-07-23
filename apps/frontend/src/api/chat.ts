import { useChatStore, type Source } from "../store/chatStore";

const { startStream, finishStream, failStream, setStreamConversationId, setSources, appendToken } = useChatStore.getState()

let controller: AbortController | null = null

function handleEvent(event: string, data: string): string | null {
  switch(event) {
    case 'conversation': {
      const parsed = JSON.parse(data) as { conversationId: string }
      setStreamConversationId(parsed.conversationId)
      return parsed.conversationId
    }

    case 'sources': {
      const parsed = JSON.parse(data) as { sources: Source[] }
      setSources(parsed.sources)
      return null
    }

    case 'token': {
      const parsed = JSON.parse(data) as { token: string }
      appendToken(parsed.token)
      break
    }

    case 'done': {
      finishStream()
      break
    }

    case 'error': {
      const parsed = JSON.parse(data) as { message: string }
      failStream(parsed.message)
      break
    }
  }
  return null
}

export async function streamChat(
  message: string,
  conversationId: string | undefined,
  onConversationCreated?: (id: string) => void
): Promise<string | null> {
  let resultId: string | null = conversationId ?? null
  controller = new AbortController()
  startStream(message, conversationId ?? null)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId: conversationId ?? undefined }),
      signal: controller.signal
    })
    if(!res.ok || !res.body) throw new Error(`Chat request failed: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while(true) {
      const {done, value} = await reader.read()
      if(done) break
      buffer += decoder.decode(value, {stream: true})

      const blocks = buffer.split('\n\n')
      buffer = blocks.pop()!

      for(const block of blocks) {
        let event = 'message'
        let data = ''

        for(const line of block.split('\n')) {
          if(line.startsWith('event: ')) event = line.slice(7)
            else if(line.startsWith('data: ')) data += line.slice(6)
        }

        if(data) {
          const id = handleEvent(event, data)
          if(id) {
            resultId = id
            onConversationCreated?.(id)
          }
        }
      }
    }

  } catch (err) {
    if(err instanceof Error && err.name === 'AbortError') {
      finishStream()
    } else {
      failStream(err instanceof Error ? err.message : 'Stream failed')
    }
  } finally {
    controller = null
  }

  return resultId
}

export function stopChat() {
  controller?.abort()
}
