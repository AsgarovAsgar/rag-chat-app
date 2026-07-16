import { useState } from "react";
import type { Source } from "../store/chatStore";

export function SourceChips({ sources }: { sources: Source[]}) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div>
      <div>
        {sources.map((s,i) => (
          <button key={i} onClick={() => setOpen(prev => prev === i ? null : i)}>
            <span>{i+1}</span>
            <span>{s.filename}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <section>
          <p>Similarity: {(sources[open].similarity * 100).toFixed(2)}%</p>
          <p>{sources[open].content}</p>
        </section>
      )}
    </div>
  )
}