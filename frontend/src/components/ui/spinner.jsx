import { cn } from "cn"
import { Spinner as SpinnerIcon } from "@phosphor-icons/react"

function Spinner({ className, ...props }) {
  return (
    <SpinnerIcon
      data-slot="spinner"
      className={cn("animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
