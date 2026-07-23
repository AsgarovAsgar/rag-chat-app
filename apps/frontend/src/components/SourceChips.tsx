import { useState } from "react";

import type { Source } from "@/api/messages";
import { cn } from "@/lib/utils";

export function SourceChips({ sources, cited }: { sources: Source[], cited: Set<number> }) {
  const [open, setOpen] = useState<number | null>(null)

  if (cited.size === 0) return null

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
              onClick={() => setOpen(prev => prev === i ? null : i)}
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                open === i && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      {open !== null && (
        <section className="mt-2 max-w-xl rounded-md border bg-muted/50 p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{sources[open].filename}</span>
            {' · '}{(sources[open].similarity * 100).toFixed(0)}% match
          </p>
          <p className="mt-1 text-muted-foreground">{sources[open].content}</p>
        </section>
      )}
    </div>
  )
}