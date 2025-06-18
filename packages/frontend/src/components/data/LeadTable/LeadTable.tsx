import { useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useLeads } from "@/hooks/queries/leads/useLeads"
import { DataTable } from "../DataTable"
import { getColumns } from "./columns"
import { LeadTableFilters } from "./LeadTableFilters"
import { EmptyLeadsState } from "@/components/leads/EmptyLeadsState"
import { useFilterStore, useHasActiveFilters, useFilterStoreHasHydrated } from "@/stores/filterStore"
import { Lead, LeadType } from "@partner-portal/shared"
import { hasEngagementInterest } from "@/constants/leads"

interface LeadTableProps {
  leadType?: LeadType; // Deprecated: Use engagementInterestFilter instead
  engagementInterestFilter?: string; // Filter by engagement interest value (e.g., ENGAGEMENT_INTEREST.FOSTER)
}

export function LeadTable({ leadType, engagementInterestFilter }: LeadTableProps = {}) {
  const navigate = useNavigate()
  const { data, isLoading } = useLeads()
  const { resetLeadFilters } = useFilterStore()
  const hasFilters = useHasActiveFilters()
  const hasHydrated = useFilterStoreHasHydrated()
  
  // Apply client-side filtering since backend doesn't support type filtering yet
  // TODO: Remove client-side filtering once backend supports type filtering
  // WARNING: This approach fetches ALL leads and filters client-side, which will not scale
  // well with large datasets. Consider implementing server-side filtering or pagination
  // limits before production deployment.
  const allLeads = data?.data || []
  
  // Memoize filtered leads to avoid recalculating on every render
  const leads = useMemo(() => {
    // Filter by engagement interest if provided (inclusive filtering)
    if (engagementInterestFilter) {
      return allLeads.filter(lead => 
        hasEngagementInterest(lead.engagementInterest, engagementInterestFilter)
      )
    } 
    // Fall back to type filtering if no engagement interest filter is provided
    // Note: leadType prop is deprecated and will be removed in the future
    else if (leadType) {
      return allLeads.filter(lead => lead.type === leadType)
    }
    return allLeads
  }, [allLeads, engagementInterestFilter, leadType])
  
  // Memoize columns to avoid recreating on every render
  const columns = useMemo(() => getColumns(navigate), [navigate])

  // Memoize row click handler to avoid recreating on every render
  const handleRowClick = useCallback((lead: Lead) => {
    navigate(`/leads/${lead.id}`)
  }, [navigate])

  // Show loading state while filters are hydrating from localStorage
  if (!hasHydrated) {
    return (
      <div className="rounded-md border bg-card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
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
      toolbar={<LeadTableFilters hideTypeFilter={!!leadType || !!engagementInterestFilter} />}
      onRowClick={handleRowClick}
      getRowId={(row) => row.id}
    />
  )
}