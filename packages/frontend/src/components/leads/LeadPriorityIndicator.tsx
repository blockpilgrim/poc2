import { AlertCircle, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeadPriorityIndicatorProps {
  priority?: "low" | "medium" | "high"
  showLabel?: boolean
}

const priorityConfig = {
  low: {
    icon: ArrowDown,
    color: "text-green-600",
    label: "Low Priority",
  },
  medium: {
    icon: AlertCircle,
    color: "text-yellow-600",
    label: "Medium Priority",
  },
  high: {
    icon: ArrowUp,
    color: "text-red-600",
    label: "High Priority",
  },
}

export function LeadPriorityIndicator({ priority, showLabel = false }: LeadPriorityIndicatorProps) {
  if (!priority) return null

  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-1">
      <Icon
        className={cn("h-4 w-4", config.color)}
        aria-hidden="true"
      />
      <span className="sr-only">{config.label}</span>
      {showLabel && (
        <span className={cn("text-sm font-medium", config.color)}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      )}
    </div>
  )
}