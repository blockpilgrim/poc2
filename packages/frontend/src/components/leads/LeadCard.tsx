import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Lead } from "@partner-portal/shared"
import { LeadStatusBadge } from "./LeadStatusBadge"
import { LeadTypeBadge } from "./LeadTypeBadge"
import { Mail, Calendar, Building } from "lucide-react"
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
            <h3 className="font-semibold text-lg">{lead.subjectName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {lead.assignedOrganizationName && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span>{lead.assignedOrganizationName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <LeadTypeBadge type={lead.type} />
        </div>
        
        <div className="space-y-2 text-sm">
          {lead.subjectEmail && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{lead.subjectEmail}</span>
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