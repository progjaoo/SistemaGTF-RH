import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Tema claro fixo nos tokens Genesis (sem next-themes: app sem dark mode).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-teal-deep" />,
        info: <InfoIcon className="size-4 text-[#2b7cb0]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#8a6d00]" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin text-teal-deep" />,
      }}
      toastOptions={{
        style: {
          background: "#FFFFFF",
          color: "#20262c",
          border: "1px solid #d9e0e6",
          fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
        } as React.CSSProperties,
      }}
      {...props}
    />
  )
}

export { Toaster }
