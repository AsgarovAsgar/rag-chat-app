import { Fragment } from "react";

export function CitedText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g)

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (!match) return <Fragment key={i}>{part}</Fragment>
        return (
          <sup key={i} className="mx-0.5 font-medium text-primary">
            [{match[1]}]
          </sup>
        )
      })}
    </>
  )
}