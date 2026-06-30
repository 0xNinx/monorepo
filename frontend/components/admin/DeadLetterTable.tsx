"use client"

import * as React from "react"
import { useState } from "react"
import {
  RefreshCw,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DeadLetterItem } from "@/lib/outboxAdminApi"

function formatDate(d: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(d))
  } catch {
    return d
  }
}

type DeadLetterTableProps = {
  items: DeadLetterItem[]
  loading: boolean
  page: number
  totalPages: number
  total: number
  retryingIds: Set<string>
  dismissingIds: Set<string>
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
  onPageChange: (page: number) => void
}

export function DeadLetterTable({
  items,
  loading,
  page,
  totalPages,
  total,
  retryingIds,
  dismissingIds,
  onRetry,
  onDismiss,
  onPageChange,
}: DeadLetterTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading dead-letter records">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full border-2 border-foreground" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4" role="status">
        <p className="text-sm font-medium text-muted-foreground mb-2">No dead-letter records found</p>
        <p className="text-xs text-muted-foreground">All outbox events are processing normally.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border-3 border-foreground bg-card shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
        <Table className="w-full">
          <TableHeader className="bg-muted/50 border-b-3 border-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-4 py-3" />
              <TableHead className="px-4 py-3 font-black text-foreground">Type / Tx</TableHead>
              <TableHead className="px-4 py-3 font-black text-foreground w-20">Retries</TableHead>
              <TableHead className="px-4 py-3 font-black text-foreground max-w-xs">Failure Reason</TableHead>
              <TableHead className="px-4 py-3 font-black text-foreground">Last Attempt</TableHead>
              <TableHead className="px-4 py-3 font-black text-foreground text-right w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isExpanded = expandedIds.has(item.id)
              const isRetrying = retryingIds.has(item.id)
              const isDismissing = dismissingIds.has(item.id)
              const hasActionsInFlight = isRetrying || isDismissing

              return (
                <React.Fragment key={item.id}>
                  <TableRow
                    className="border-b-2 border-foreground hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => toggleRow(item.id)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    aria-label={`Outbox record of type ${item.eventType}, click to view payload`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleRow(item.id)
                      }
                    }}
                  >
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-black truncate max-w-[180px] bg-muted px-2 py-0.5 border-2 border-foreground w-fit shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]">
                          {item.eventType}
                        </span>
                        {item.txType && (
                          <span className="text-[10px] text-muted-foreground font-mono pl-1">
                            Tx: {item.txType}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className="font-bold border-2 border-foreground bg-background">
                        {item.retryCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-destructive font-semibold truncate" title={item.failureReason}>
                        {item.failureReason}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(item.lastAttemptedAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={hasActionsInFlight}
                          onClick={() => onRetry(item.id)}
                          aria-label={`Retry processing event ${item.eventType}`}
                          className="border-2 border-foreground bg-background font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all h-8"
                        >
                          {isRetrying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span className="sr-only sm:not-sr-only pl-1">Retry</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={hasActionsInFlight}
                          onClick={() => onDismiss(item.id)}
                          aria-label={`Dismiss event ${item.eventType}`}
                          className="border-2 border-foreground bg-destructive text-destructive-foreground font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all h-8"
                        >
                          {isDismissing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span className="sr-only sm:not-sr-only pl-1">Dismiss</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/10 border-b-2 border-foreground">
                      <TableCell colSpan={6} className="px-6 py-4">
                        <div className="text-xs space-y-3">
                          <div>
                            <p className="font-black text-foreground mb-1">Payload Detail</p>
                            <pre className="overflow-x-auto rounded border-2 border-foreground bg-background p-3 text-xs leading-relaxed font-mono shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] max-h-60">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-muted-foreground">
                            <div>
                              <span className="font-bold text-foreground">Record ID:</span>{" "}
                              <span className="font-mono">{item.id}</span>
                            </div>
                            <div>
                              <span className="font-bold text-foreground">Created At:</span>{" "}
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                          <div className="border-2 border-destructive bg-destructive/10 p-3 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                            <p className="font-black text-destructive mb-1">Full Error Track:</p>
                            <p className="font-mono text-xs text-destructive-foreground break-words bg-destructive/5 p-2 rounded">
                              {item.failureReason}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <nav
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t-2 border-foreground"
          aria-label="Pagination Navigation"
        >
          <p className="text-xs text-muted-foreground">
            Showing Page {page} of {totalPages} ({total} records total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Go to previous page"
              className="border-2 border-foreground bg-background font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] disabled:opacity-50 disabled:shadow-none h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-black px-3 py-1.5 border-2 border-foreground bg-card min-w-[2.5rem] text-center shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Go to next page"
              className="border-2 border-foreground bg-background font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] disabled:opacity-50 disabled:shadow-none h-8"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
