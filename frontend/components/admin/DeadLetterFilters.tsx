"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type DeadLetterFiltersState = {
  eventType: string
  dateFrom: string
  dateTo: string
}

type DeadLetterFiltersProps = {
  filters: DeadLetterFiltersState
  onChange: (filters: DeadLetterFiltersState) => void
  onReset: () => void
}

export function DeadLetterFilters({ filters, onChange, onReset }: DeadLetterFiltersProps) {
  const hasFilters = filters.eventType || filters.dateFrom || filters.dateTo

  return (
    <div className="border-3 border-foreground bg-card p-4 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] rounded-md">
      <div className="flex flex-wrap items-end gap-4">
        {/* Event Type Filter */}
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <Label className="text-xs font-black text-foreground" htmlFor="event-type">
            Event Type
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="event-type"
              type="text"
              placeholder="e.g. receipt, staking..."
              value={filters.eventType}
              onChange={(e) => onChange({ ...filters, eventType: e.target.value })}
              className="pl-9 h-9 border-2 border-foreground bg-background font-mono text-sm shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* From Date Filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-black text-foreground" htmlFor="date-from">
            From Date
          </Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="h-9 border-2 border-foreground bg-background text-sm font-mono shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* To Date Filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-black text-foreground" htmlFor="date-to">
            To Date
          </Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="h-9 border-2 border-foreground bg-background text-sm font-mono shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Reset Button */}
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="border-2 border-foreground bg-background font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] h-9"
          >
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
