"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/table-pagination"
import { useTr } from "@/lib/i18n/portal"

/**
 * DataTable — the single shared list-page table.
 *
 * Replaces the per-page reinvented tables + pagination found in the audit
 * (e.g. admin/companies/page.tsx rebuilding its own pagination with raw
 * gray-200/gray-50 instead of theme tokens). Column config in, dense
 * enterprise-grade table out — no page should hand-roll <table> markup.
 */
export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  /** Right/left align numeric vs text columns; defaults to left. */
  align?: "left" | "right" | "center"
  className?: string
  cell: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  loading?: boolean
  /** Skeleton row count while loading. */
  skeletonRows?: number
  emptyState?: React.ReactNode
  onRowClick?: (row: T) => void
  className?: string
  pagination?: {
    currentPage: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
  }
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right [font-variant-numeric:tabular-nums]",
  center: "text-center",
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading,
  skeletonRows = 5,
  emptyState,
  onRowClick,
  className,
  pagination,
}: DataTableProps<T>) {
    const tr = useTr()
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={cn(alignClass[col.align ?? "left"], col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={alignClass[col.align ?? "left"]}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyState ?? tr("No results.")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(alignClass[col.align ?? "left"], col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && !loading && data.length > 0 && (
        <TablePagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  )
}
