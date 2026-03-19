import { useCountdown } from "@/hooks/useCountdown"
import { cn } from "@/lib/utils"

type CountdownTimerProps = {
  endTime: Date | string
  size?: "sm" | "md" | "lg"
}

const pad = (value: number) => String(value).padStart(2, "0")

/**
 * Displays a live auction countdown with urgency color states.
 */
export default function CountdownTimer({ endTime, size = "md" }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isExpired, totalSeconds } = useCountdown(endTime)

  if (isExpired) {
    return <p className="text-sm font-semibold text-destructive">Auction Ended</p>
  }

  const isCritical = totalSeconds < 300
  const isWarning = totalSeconds < 3600

  const boxBaseClass = isCritical
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : isWarning
      ? "border-amber-400/50 bg-amber-500/10 text-amber-700"
      : "border-border bg-muted/60 text-foreground"

  const boxSizeClass =
    size === "sm"
      ? "h-10 min-w-10 rounded-md px-2"
      : size === "lg"
        ? "h-16 min-w-16 rounded-lg px-3"
        : "h-12 min-w-12 rounded-md px-2.5"

  const numberSizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base"
  const labelSizeClass = size === "lg" ? "text-[11px]" : "text-[10px]"

  return (
    <div className={cn("inline-flex items-end gap-1.5", isCritical ? "animate-pulse" : "") }>
      {[
        { label: "days", value: days },
        { label: "hours", value: hours },
        { label: "mins", value: minutes },
        { label: "secs", value: seconds },
      ].map((item, index) => (
        <div key={item.label} className="flex items-end gap-1.5">
          <div className={cn("flex flex-col items-center justify-center border", boxBaseClass, boxSizeClass)}>
            <span className={cn("font-semibold tabular-nums", numberSizeClass)}>{pad(item.value)}</span>
            <span className={cn("uppercase tracking-wide text-muted-foreground", labelSizeClass)}>
              {item.label}
            </span>
          </div>
          {index < 3 ? <span className="pb-4 text-muted-foreground">:</span> : null}
        </div>
      ))}
    </div>
  )
}
