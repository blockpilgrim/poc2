import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyLeadsStateProps {
  hasFilters?: boolean
  onResetFilters?: () => void
}

export function EmptyLeadsState({ hasFilters = false, onResetFilters }: EmptyLeadsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? "No leads found" : "No leads yet"}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {hasFilters
          ? "Try adjusting your filters to find what you're looking for."
          : "When new leads are added to your organization, they'll appear here."}
      </p>
      
      {hasFilters && onResetFilters && (
        <Button variant="outline" onClick={onResetFilters}>
          Reset filters
        </Button>
      )}
    </div>
  )
}