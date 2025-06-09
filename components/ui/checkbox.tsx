"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checked, ...props }, ref) => {
    // Manejar tanto onChange como onCheckedChange
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e)
      }
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
    }

    return (
      <div className="relative">
        <input
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-background",
            className,
          )}
          ref={ref}
          onChange={handleChange}
          checked={checked}
          {...props}
        />
        <Check className="absolute top-0 left-0 h-4 w-4 text-primary opacity-0 peer-checked:opacity-100 pointer-events-none" />
      </div>
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
