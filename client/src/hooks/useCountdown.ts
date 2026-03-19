import { useEffect, useMemo, useState } from "react"

type CountdownState = {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  isEndingSoon: boolean
  totalSeconds: number
}

const getCountdownState = (target: Date): CountdownState => {
  const diffMs = target.getTime() - Date.now()

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isEndingSoon: false,
      totalSeconds: 0,
    }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isEndingSoon: totalSeconds < 120,
    totalSeconds,
  }
}

/**
 * Tracks a ticking countdown until the provided end time.
 */
export function useCountdown(endTime: Date | string) {
  const targetDate = useMemo(() => new Date(endTime), [endTime])
  const [countdown, setCountdown] = useState<CountdownState>(() => getCountdownState(targetDate))

  useEffect(() => {
    setCountdown(getCountdownState(targetDate))

    if (Number.isNaN(targetDate.getTime())) {
      return
    }

    const timer = window.setInterval(() => {
      setCountdown((previousValue) => {
        if (previousValue.isExpired) {
          window.clearInterval(timer)
          return previousValue
        }

        const nextValue = getCountdownState(targetDate)

        if (nextValue.isExpired) {
          window.clearInterval(timer)
        }

        return nextValue
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [targetDate])

  return countdown
}
