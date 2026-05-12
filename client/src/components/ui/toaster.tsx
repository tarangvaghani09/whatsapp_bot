import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon =
          variant === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : variant === "destructive" ? (
            <XCircle className="w-5 h-5 text-white shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-gray-500 shrink-0" />
          )

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-3">
              {icon}
              <div className="grid gap-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose className={variant === "success" || variant === "destructive" ? "text-white/70 hover:text-white" : ""} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
