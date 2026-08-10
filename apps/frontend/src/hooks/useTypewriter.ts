// hooks/useTypewriter.ts
import { useEffect, useRef, useState } from 'react'

const CHAR_MS = 25

export function useTypewriter(value: string, enabled: boolean): string {
  const [shown, setShown] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    if (!enabled || value === previous.current) {
      previous.current = value
      setShown(value)
      return
    }

    previous.current = value
    let i = 0
    setShown('')

    const id = setInterval(() => {
      i += 1
      setShown(value.slice(0, i))
      if (i >= value.length) clearInterval(id)
    }, CHAR_MS)

    return () => clearInterval(id)
  }, [value, enabled])

  return shown
}
