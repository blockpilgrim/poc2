import { useNavigate } from "react-router-dom"
import { useLeads } from "@/hooks/queries/leads/useLeads"
import { DataTable } from "../DataTable"
import { getColumns } from "./columns"
import { LeadTableFilters } from "./LeadTableFilters"
import { EmptyLeadsState } from "@/components/leads/EmptyLeadsState"
import { useFilterStore, useHasActiveFilters } from "@/stores/filterStore"
import { Lead } from "@partner-portal/shared"

export function LeadTable() {
  const navigate = useNavigate()
  const { data, isLoading } = useLeads()
  const { resetLeadFilters } = useFilterStore()
  const hasFilters = useHasActiveFilters()
  
  const leads = data?.data || []
  const columns = getColumns(navigate)

  const handleRowClick = (lead: Lead) => {
    navigate(`/leads/${lead.id}`)
  }

  if (!isLoading && leads.length === 0) {
    return (
      <div className="rounded-md border bg-card">
        <EmptyLeadsState
          hasFilters={hasFilters}
          onResetFilters={resetLeadFilters}
        />
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={leads}
      isLoading={isLoading}
      toolbar={<LeadTableFilters />}
      onRowClick={handleRowClick}
      getRowId={(row) => row.id}
    />
  )
}