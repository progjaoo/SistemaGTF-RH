import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-extrabold whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        good: "bg-teal-bg text-teal-deep",
        warn: "bg-gold-soft text-[#8a6d00]",
        muted: "bg-[#edf0f3] text-muted",
        info: "bg-sky/15 text-[#2b7cb0]",
        special: "bg-gold text-ink",
        danger: "bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      variant: "good",
    },
  }
)

function Badge({
  className,
  variant = "good",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
