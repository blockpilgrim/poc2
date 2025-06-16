import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon } from "@radix-ui/react-icons"
import { Column } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sortStatus = column.getIsSorted()
  const ariaLabel = `Sort by ${title} ${
    sortStatus === "asc" 
      ? "descending" 
      : sortStatus === "desc" 
      ? "clear sorting" 
      : "ascending"
  }`

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => {
          const isSorted = column.getIsSorted()
          if (isSorted === "asc") {
            column.toggleSorting(true)
          } else if (isSorted === "desc") {
            column.clearSorting()
          } else {
            column.toggleSorting(false)
          }
        }}
        aria-label={ariaLabel}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDownIcon className="ml-2 h-4 w-4" aria-hidden="true" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUpIcon className="ml-2 h-4 w-4" aria-hidden="true" />
        ) : (
          <CaretSortIcon className="ml-2 h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}