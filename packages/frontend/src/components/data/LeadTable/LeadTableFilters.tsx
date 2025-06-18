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

export function LeadTableFilters() {
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
        
        <div title="Status filtering coming soon">
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
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div title="Type filtering coming soon">
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
              <SelectItem value="foster">Foster</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>


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