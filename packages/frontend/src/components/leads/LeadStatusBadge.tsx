import { Badge } from "@/components/ui/badge"
import { LeadStatus } from "@partner-portal/shared"

interface LeadStatusBadgeProps {
  status: LeadStatus
}

const statusConfig: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualified: { label: "Qualified", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  converted: { label: "Converted", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
  lost: { label: "Lost", variant: "destructive" },
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" }
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}