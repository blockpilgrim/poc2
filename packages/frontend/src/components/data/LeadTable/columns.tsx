import { ColumnDef } from "@tanstack/react-table"
import { Lead } from "@partner-portal/shared"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Mail, Phone } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "../DataTable"
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge"
import { LeadTypeBadge } from "@/components/leads/LeadTypeBadge"
import { LeadPriorityIndicator } from "@/components/leads/LeadPriorityIndicator"
import { format } from "date-fns"

export const getColumns = (navigate: (path: string) => void): ColumnDef<Lead>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue("displayName")}</span>
          {row.original.assignedOrganizationName && (
            <span className="text-sm text-muted-foreground">
              {row.original.assignedOrganizationName}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <LeadStatusBadge status={row.getValue("status")} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => <LeadTypeBadge type={row.getValue("type")} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => <LeadPriorityIndicator priority={row.getValue("priority")} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return email ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-normal"
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = `mailto:${email}`
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          <span className="truncate">{email}</span>
        </Button>
      ) : null
    },
  },
  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => {
      const phone = row.getValue("phoneNumber") as string
      return phone ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-normal"
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = `tel:${phone}`
          }}
        >
          <Phone className="mr-2 h-4 w-4" />
          <span>{phone}</span>
        </Button>
      ) : null
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date
      return <span>{format(new Date(date), "MMM d, yyyy")}</span>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const lead = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  await navigator.clipboard.writeText(lead.id)
                } catch (error) {
                  console.error('Failed to copy lead ID:', error)
                }
              }}
            >
              Copy lead ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/leads/${lead.id}`)
              }}
            >
              View details
            </DropdownMenuItem>
            {lead.email && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `mailto:${lead.email}`
                }}
              >
                Send email
              </DropdownMenuItem>
            )}
            {lead.phoneNumber && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `tel:${lead.phoneNumber}`
                }}
              >
                Call
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]