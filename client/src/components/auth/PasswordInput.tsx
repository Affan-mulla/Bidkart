import { EyeIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { forwardRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Input } from "../ui/input"

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={isVisible ? "text" : "password"}
        className={cn("h-9 bg-white pr-10", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((prev) => !prev)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={isVisible ? ViewOffIcon : EyeIcon} className="size-4" />
      </button>
    </div>
  )
})

export default PasswordInput
