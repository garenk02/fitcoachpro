import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, ...props }, ref) => {
    // Handle numeric inputs to prevent NaN errors
    const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        // For empty values in number inputs, pass empty string instead of NaN
        if (e.target.value === '') {
          // Create a synthetic event with empty string value
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: ''
            }
          } as React.ChangeEvent<HTMLInputElement>;

          onChange(syntheticEvent);
          return;
        }

        // For valid values, pass the event normally
        onChange(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-sans",
          className
        )}
        ref={ref}
        value={value}
        onChange={type === 'number' ? handleNumericInput : onChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
