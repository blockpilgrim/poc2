import { Cross2Icon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFilterStore } from "@/stores/filterStore"
import { LeadStatus, LeadType } from "@partner-portal/shared"
import { LEAD_STATUS, LEAD_TYPE, LEAD_UI_MESSAGES } from "@/constants/leads"

interface LeadTableFiltersProps {
  hideTypeFilter?: boolean;
}

export function LeadTableFilters({ hideTypeFilter = false }: LeadTableFiltersProps) {
  const { leadFilters, setLeadStatus, setLeadType, setLeadSearch, resetLeadFilters } = useFilterStore()
  const { search, filters } = leadFilters

  const hasFilters = search

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(event) => setLeadSearch(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        
        <div title={LEAD_UI_MESSAGES.FILTERS.STATUS_COMING_SOON}>
          <Select
            value={Array.isArray(filters.status) ? "all" : (filters.status || "all")}
            onValueChange={(value) => setLeadStatus(value === "all" ? null : value as LeadStatus)}
            disabled
          >
            <SelectTrigger className="h-8 w-[140px] opacity-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={LEAD_STATUS.ASSIGNED}>Assigned</SelectItem>
              <SelectItem value={LEAD_STATUS.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={LEAD_STATUS.CERTIFIED}>Certified</SelectItem>
              <SelectItem value={LEAD_STATUS.ON_HOLD}>On Hold</SelectItem>
              <SelectItem value={LEAD_STATUS.CLOSED}>Closed</SelectItem>
              <SelectItem value={LEAD_STATUS.OTHER}>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!hideTypeFilter && (
          <div title={LEAD_UI_MESSAGES.FILTERS.TYPE_COMING_SOON}>
            <Select
              value={Array.isArray(filters.type) ? "all" : (filters.type || "all")}
              onValueChange={(value) => setLeadType(value === "all" ? null : value as LeadType)}
              disabled
            >
              <SelectTrigger className="h-8 w-[140px] opacity-50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value={LEAD_TYPE.FOSTER}>Foster</SelectItem>
                <SelectItem value={LEAD_TYPE.VOLUNTEER}>Volunteer</SelectItem>
                <SelectItem value={LEAD_TYPE.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}


        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => resetLeadFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}