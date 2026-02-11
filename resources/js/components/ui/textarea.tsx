import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-gray-300 placeholder:text-gray-400 selection:bg-teal-100 selection:text-teal-900 flex min-h-[80px] w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-base text-gray-900 shadow-sm transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm resize-y",
        "focus-visible:border-teal-500 focus-visible:ring-teal-500/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-200 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
