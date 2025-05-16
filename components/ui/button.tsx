import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-heading",
  {
    variants: {
      variant: {
        // Primary Button (Section 4.1)
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80",
        // Destructive Button (Section 4.1)
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:bg-destructive/80 focus-visible:outline-destructive",
        // Secondary Button (Section 4.1)
        secondary:
          "border border-secondary text-secondary hover:bg-secondary/10 active:bg-secondary/20 focus-visible:outline-secondary",
        // Ghost Button
        ghost:
          "hover:bg-muted hover:text-foreground",
        // Link Button
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        // Default size - 48px height (touch-friendly) (Section 4.1)
        default: "h-12 px-4 py-3",
        // Small size
        sm: "h-10 px-3 py-2 text-sm",
        // Large size
        lg: "h-14 px-6 py-4 text-lg",
        // Icon button
        icon: "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
