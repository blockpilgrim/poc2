import { Badge } from "@/components/ui/badge"
import { LeadStatus } from "@partner-portal/shared"

interface LeadStatusBadgeProps {
  status: LeadStatus
}

const statusConfig: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  assigned: { label: "Assigned", variant: "default" },
  "in-progress": { label: "In Progress", variant: "secondary" },
  certified: { label: "Certified", variant: "default" },
  "on-hold": { label: "On Hold", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
  other: { label: "Other", variant: "outline" },
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" }
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}