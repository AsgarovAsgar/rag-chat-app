import { useChatStore, type Source } from "../store/chatStore";

const { startStream, finishStream, failStream, setSources, appendToken } = useChatStore.getState()

function handleEvent(event: string, data: string) {
  switch(event) {
    case 'sources': {
      const parsed = JSON.parse(data) as { conversationId: string, sources: Source[] }
      setSources(parsed.conversationId, parsed.sources)
      break
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
}

export async function streamChat(message: string, conversationId: string | null): Promise<void> {
  startStream()

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId: conversationId ?? undefined })
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
        
        if(data) handleEvent(event, data)
      }
    }

  } catch (err) {
    failStream(err instanceof Error ? err.message : 'Stream failed')
  }
}