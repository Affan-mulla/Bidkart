import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  size?: "sm" | "md" | "lg"
  showValue?: boolean
}

const sizeClassMap: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-2xl",
}

/**
 * Renders static or interactive star ratings with optional numeric value.
 */
export default function StarRating({ value, onChange, size = "md", showValue }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const currentValue = useMemo(() => {
    if (onChange && hovered !== null) {
      return hovered
    }

    return value
  }, [hovered, onChange, value])

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1
          const isInteractive = Boolean(onChange)

          const isFull = currentValue >= starValue
          const isHalf = !isFull && currentValue >= starValue - 0.5

          return (
            <button
              key={starValue}
              type="button"
              disabled={!isInteractive}
              onMouseEnter={() => {
                if (!isInteractive) {
                  return
                }

                setHovered(starValue)
              }}
              onMouseLeave={() => {
                if (!isInteractive) {
                  return
                }

                setHovered(null)
              }}
              onClick={() => {
                if (!onChange) {
                  return
                }

                onChange(starValue)
              }}
              className={cn(
                "leading-none transition-transform",
                sizeClassMap[size],
                isInteractive ? "cursor-pointer hover:scale-105" : "cursor-default",
              )}
              aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            >
              {isFull ? (
                <span className="text-amber-400">★</span>
              ) : isHalf ? (
                <span className="relative inline-block text-gray-300">
                  ☆
                  <span className="absolute inset-0 w-1/2 overflow-hidden text-amber-400">★</span>
                </span>
              ) : (
                <span className="text-gray-300">☆</span>
              )}
            </button>
          )
        })}
      </div>

      {showValue ? <span className="text-sm text-muted-foreground">{value.toFixed(1)}</span> : null}
    </div>
  )
}
