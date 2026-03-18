import { useEffect, useMemo, useRef } from "react"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const OTP_LENGTH = 6

export default function OtpInput({ value, onChange, disabled = false }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const otpChars = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? ""),
    [value],
  )

  useEffect(() => {
    if (value.length === OTP_LENGTH) {
      inputRefs.current[OTP_LENGTH - 1]?.blur()
    }
  }, [value])

  const updateDigit = (index: number, digit: string) => {
    const next = [...otpChars]
    next[index] = digit
    onChange(next.join(""))
  }

  const handleInput = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1)
    updateDigit(index, digit)

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
      inputRefs.current[index + 1]?.select()
    }
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpChars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      inputRefs.current[index - 1]?.select()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").trim()
    if (!/^\d{6}$/.test(pasted)) {
      return
    }

    event.preventDefault()
    onChange(pasted)
    inputRefs.current[OTP_LENGTH - 1]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {otpChars.map((char, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          value={char}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          disabled={disabled}
          maxLength={1}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          className="size-11 rounded-md border border-input bg-white text-center text-lg font-semibold tracking-wider outline-none transition-colors focus-visible:border-[#9b2c2c] focus-visible:ring-2 focus-visible:ring-[#9b2c2c]/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      ))}
    </div>
  )
}
