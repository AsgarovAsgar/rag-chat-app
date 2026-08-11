import { useState } from "react";

import type { Source } from "@/api/messages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils";

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }

const HEADING_RE = /^(#{1,6}\s+.+|\d+(\.\d+)*\s+[A-Z].{0,60}|[A-Z][A-Za-z ]{2,40})$/

function parseExcerpt(raw: string): Block[] {
  const text = raw
    // Rejoin words hyphenated across a line break: "down-\nstream" -> "downstream"
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
    // Normalize spaced reference brackets: "[ 20 ]" -> "[20]"
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')

  const blocks: Block[] = []
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length === 0) return
    const joined = buffer.join(' ').replace(/[ \t]+/g, ' ').trim()
    if (joined) blocks.push({ kind: 'paragraph', text: joined })
    buffer = []
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()

    // Blank line, or a short standalone line that looks like a heading,
    // ends the current paragraph.
    if (!trimmed) {
      flush()
      continue
    }

    if (trimmed.length < 60 && HEADING_RE.test(trimmed)) {
      flush()
      blocks.push({ kind: 'heading', text: trimmed.replace(/^#+\s+/, '') })
      continue
    }

    buffer.push(trimmed)
  }

  flush()
  return blocks
}

export function SourceChips({ sources, cited }: { sources: Source[], cited: Set<number> }) {
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  if (cited.size === 0) return null

  const active = selectedSourceIndex === null ? null : sources[selectedSourceIndex]

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Sources:</span>
        {sources.map((s, i) => {
          if (!cited.has(i + 1)) return null
          return (
            <button
              key={i}
              title={s.filename}
              onClick={() => {
                setSelectedSourceIndex(i)
                setOpen(true)
              }}
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                open && selectedSourceIndex === i && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {active && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="truncate pr-6 text-xs font-normal text-muted-foreground">
                <span className="font-medium text-foreground">{active.filename}</span>
                {' · '}{(active.similarity * 100).toFixed(0)}% match
              </DialogTitle>
            </DialogHeader>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4 space-y-1">
              {parseExcerpt(active.content).map((block, i) =>
                block.kind === 'heading' ? (
                  <p key={i} className="text-sm font-semibold text-foreground">
                    {block.text}
                  </p>
                ) : (
                  <p key={i} className="text-sm leading-relaxed text-foreground/80">
                    {block.text}
                  </p>
                )
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}