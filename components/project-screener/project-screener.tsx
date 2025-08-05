"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Download, Eye, Filter, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MiningProject, ProjectStage, Commodity, RiskLevel } from "@/lib/types/mining-project"
import { useProjects } from "@/lib/hooks/use-projects"
import { ProjectFilters } from "./project-filters"
import { BulkActionsToolbar } from "./bulk-actions-toolbar"
import { ProjectDetailPanel } from "@/components/project-detail-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { MiningAgentEnhanced } from "@/components/mining-agent-enhanced"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

const defaultVisibleColumns = [
  "select",
  "project",
  "stage",
  "mineLife",
  "postTaxNPV",
  "irr",
  "paybackYears",
  "capex",
  "aisc",
  "primaryCommodity",
  "jurisdiction",
  "investorsOwnership",
]

const hiddenColumns = [
  "resourceGrade",
  "containedMetal",
  "esgScore",
  "redFlags",
  "permitStatus",
  "offtakeAgreements",
]

function getRiskBadgeColor(risk: RiskLevel) {
  switch (risk) {
    case "Low":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "High":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    case "Very High":
      return "bg-red-100 text-red-800 hover:bg-red-100"
  }
}

function getIRRColor(irr: number) {
  if (irr >= 30) return "text-green-600 font-semibold"
  if (irr >= 20) return "text-yellow-600"
  return "text-red-600"
}

function getESGBadgeColor(grade?: string) {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800"
    case "B":
      return "bg-blue-100 text-blue-800"
    case "C":
      return "bg-yellow-100 text-yellow-800"
    case "D":
      return "bg-orange-100 text-orange-800"
    case "F":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

interface DetailPanelState {
  isOpen: boolean;
  mode: "single" | "comparison";
  selectedProjects: MiningProject[];
}

export function ProjectScreener() {
  const { projects: data, loading, error, refetch } = useProjects()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")
  
  // Project detail panel state
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<MiningProject[]>([])
  const [detailPanelMode, setDetailPanelMode] = useState<"single" | "comparison">("single")
  const [miningAgentRunning, setMiningAgentRunning] = useState(false)
  const [miningAgentProgress, setMiningAgentProgress] = useState<string>("")

  // Listen for refresh events
  useEffect(() => {
    const handleRefreshProjects = () => {
      // Refetch data when mining agent completes
      refetch()
    }
    
    window.addEventListener('refreshProjects', handleRefreshProjects)
    
    return () => {
      window.removeEventListener('refreshProjects', handleRefreshProjects)
    }
  }, [refetch])

  // Set default column visibility
  useEffect(() => {
    const hiddenCols = Object.fromEntries(
      hiddenColumns.map((col: string) => [col, false])
    )
    setColumnVisibility(prev => ({
      ...hiddenCols,
      ...prev
    }))
  }, [])

  const handleProjectClick = (projectId: string) => {
    const project = data.find(p => p.id === projectId)
    if (project) {
      setSelectedProjects([project])
      setDetailPanelMode("single")
      setDetailPanelOpen(true)
    }
  }

  const handleProjectAnalysis = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    if (selectedRows.length === 1) {
      setSelectedProjects(selectedRows.map(row => row.original))
      setDetailPanelMode("single")
      setDetailPanelOpen(true)
    }
  }

  const handleCompareProjects = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    if (selectedRows.length >= 2) {
      setSelectedProjects(selectedRows.map(row => row.original))
      setDetailPanelMode("comparison")
      setDetailPanelOpen(true)
    }
  }

  const handleMiningAgentProgress = (isRunning: boolean, message?: string) => {
    setMiningAgentRunning(isRunning)
    setMiningAgentProgress(message || "")
  }

  const columns: ColumnDef<MiningProject>[] = [
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
      accessorKey: "project",
      header: "Project",
      cell: ({ row }) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            handleProjectClick(row.original.id)
          }}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.getValue("project")}
        </a>
      ),
    },
    {
      accessorKey: "stage",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Stage / Study Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("stage")}</div>,
    },
    {
      accessorKey: "mineLife",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Mine Life (yrs)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("mineLife")}</div>,
    },
    {
      accessorKey: "postTaxNPV",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Post-tax NPV (USD M)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("postTaxNPV"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "irr",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            IRR %
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const irr = parseFloat(row.getValue("irr"))
        return (
          <div className={cn("text-center", getIRRColor(irr))}>
            {irr.toFixed(1)}%
          </div>
        )
      },
    },
    {
      accessorKey: "paybackYears",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Payback yrs
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-center">{parseFloat(row.getValue("paybackYears")).toFixed(1)}</div>
      ),
    },
    {
      accessorKey: "capex",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Capex (US $ M)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("capex"))
        const formatted = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)
        return <div className="text-right">${formatted}</div>
      },
    },
    {
      accessorKey: "aisc",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            AISC (US $/t)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("aisc"))
        return <div className="text-right">${amount.toFixed(2)}/t</div>
      },
    },
    {
      accessorKey: "primaryCommodity",
      header: "Primary Commodity",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.getValue("primaryCommodity")}
        </Badge>
      ),
    },
    {
      accessorKey: "jurisdiction",
      header: "Jurisdiction & Risk",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{row.original.jurisdiction}</span>
          <Badge className={cn("w-fit", getRiskBadgeColor(row.original.riskLevel))}>
            {row.original.riskLevel}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "investorsOwnership",
      header: "Investors/Ownership",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue("investorsOwnership")}>
          {row.getValue("investorsOwnership")}
        </div>
      ),
    },
    // Hidden columns
    {
      accessorKey: "resourceGrade",
      header: "Resource Grade",
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue("resourceGrade")} {row.original.gradeUnit}
        </div>
      ),
    },
    {
      accessorKey: "containedMetal",
      header: "Contained Metal",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("containedMetal") || "0")
        const formatted = new Intl.NumberFormat("en-US").format(amount)
        return <div className="text-right">{formatted} t</div>
      },
    },
    {
      accessorKey: "esgScore",
      header: "ESG Score",
      cell: ({ row }) => (
        <Badge className={cn("w-fit", getESGBadgeColor(row.getValue("esgScore")))}>
          {row.getValue("esgScore") || "N/A"}
        </Badge>
      ),
    },
    {
      accessorKey: "redFlags",
      header: "Red Flags",
      cell: ({ row }) => {
        const flags = row.getValue("redFlags") as string[] | undefined
        if (!flags || flags.length === 0) return <span className="text-gray-400">None</span>
        return (
          <div className="flex flex-col gap-1">
            {flags.map((flag, i) => (
              <Badge key={i} variant="destructive" className="text-xs">
                {flag}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "permitStatus",
      header: "Permit Status",
      cell: ({ row }) => {
        const status = row.getValue("permitStatus") as string
        if (!status) return <span className="text-gray-400">N/A</span>
        
        const statusColors = {
          "Granted": "bg-green-100 text-green-800",
          "Pending": "bg-yellow-100 text-yellow-800",
          "In Process": "bg-blue-100 text-blue-800",
          "Not Applied": "bg-gray-100 text-gray-800",
        }
        
        return (
          <Badge className={cn("w-fit", statusColors[status as keyof typeof statusColors])}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "offtakeAgreements",
      header: "Off-take Agreements",
      cell: ({ row }) => {
        const agreements = row.getValue("offtakeAgreements") as string[] | undefined
        if (!agreements || agreements.length === 0) return <span className="text-gray-400">None</span>
        return <div className="text-sm">{agreements.join(", ")}</div>
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  const selectedRowsCount = Object.keys(rowSelection).length

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-muted-foreground">Failed to load projects. Using sample data.</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full space-y-4 relative">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Projects Screener — {data.length} deposits</h2>
          <div className="flex items-center gap-2">
            <MiningAgentEnhanced onProgressChange={handleMiningAgentProgress} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View Data in Public Company Search
              </Button>
              <Button variant="outline" size="sm">
                Set Alerts
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </div>
          </div>
        </div>

        <ProjectFilters table={table} />

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedRowsCount} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
        </div>

        {selectedRowsCount > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedRowsCount}
            selectedProjects={table.getFilteredSelectedRowModel().rows.map(row => row.original)}
            onClearSelection={() => setRowSelection({})}
            onProjectAnalysis={handleProjectAnalysis}
            onCompare={handleCompareProjects}
          />
        )}

        <div className="rounded-lg border relative overflow-hidden">
          {/* Mining agent progress overlay */}
          {miningAgentRunning && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-sm text-muted-foreground font-medium">
                  {miningAgentProgress || "Running mining agent..."}
                </div>
              </div>
            </div>
          )}
          
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Project Detail Panel */}
      <ProjectDetailPanel
        isOpen={detailPanelOpen}
        onClose={() => setDetailPanelOpen(false)}
        projects={selectedProjects}
        mode={detailPanelMode}
        onProjectSelect={(projectId) => {
          const project = data.find(p => p.id === projectId)
          if (project) {
            setSelectedProjects([project])
            setDetailPanelMode("single")
          }
        }}
      />
    </>
  )
} 