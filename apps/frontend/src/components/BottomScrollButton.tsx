import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const SCROLL_BOTTOM_THRESHOLD = 500;

export function BottomScrollButton({ containerRef }: {containerRef: React.RefObject<HTMLDivElement | null>}) {
  const [atBottom, setAtBottom] = useState(true)

  function scrollToBottom() {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const el = containerRef.current
    if(!el) return

    const onScroll = () => {
      setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD)
    }
    
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [containerRef])


  if(atBottom) return null

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Scroll to bottom"
      className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full shadow-md"
      onClick={scrollToBottom}
    >
      <ArrowDown className="size-4" />
    </Button>
  )
}