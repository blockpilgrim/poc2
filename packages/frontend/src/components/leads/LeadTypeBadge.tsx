import { Badge } from "@/components/ui/badge"
import { LeadType } from "@partner-portal/shared"
import { Heart, Users, DollarSign, Handshake, Info } from "lucide-react"

interface LeadTypeBadgeProps {
  type: LeadType
}

const typeConfig: Record<LeadType, { label: string; icon: React.ElementType; className: string }> = {
  foster: { label: "Foster", icon: Heart, className: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
  volunteer: { label: "Volunteer", icon: Users, className: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  donor: { label: "Donor", icon: DollarSign, className: "bg-green-100 text-green-700 hover:bg-green-200" },
  partner: { label: "Partner", icon: Handshake, className: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  other: { label: "Other", icon: Info, className: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
}

export function LeadTypeBadge({ type }: LeadTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig.other
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}