import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLeadSearch, useFilterStore } from "@/stores/filterStore"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search...",
}: DataTableToolbarProps<TData>) {
  const search = useLeadSearch()
  const { setLeadSearch, resetLeadFilters } = useFilterStore()
  const isFiltered = table.getState().columnFilters.length > 0 || search.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setLeadSearch(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              resetLeadFilters()
              table.resetColumnFilters()
            }}
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