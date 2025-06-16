import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Lead } from "@partner-portal/shared"
import { LeadStatusBadge } from "./LeadStatusBadge"
import { LeadTypeBadge } from "./LeadTypeBadge"
import { LeadPriorityIndicator } from "./LeadPriorityIndicator"
import { Mail, Phone, Calendar, Building } from "lucide-react"
import { format } from "date-fns"

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{lead.displayName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {lead.assignedOrganizationName && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span>{lead.assignedOrganizationName}</span>
                </div>
              )}
            </div>
          </div>
          <LeadPriorityIndicator priority={lead.priority} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <LeadTypeBadge type={lead.type} />
        </div>
        
        <div className="space-y-2 text-sm">
          {lead.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.phoneNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{lead.phoneNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}