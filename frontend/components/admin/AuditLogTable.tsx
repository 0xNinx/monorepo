"use client";

import { Fragment, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/i18n-utils";
import type { Locale } from "@/i18n";
import type { AuditLogEntry, AuditLogPagination } from "@/lib/auditLogsApi";

interface AuditLogTableProps {
  readonly entries: AuditLogEntry[];
  readonly pagination: AuditLogPagination;
  readonly onPageChange: (page: number) => void;
}

function ResultBadge({ result }: { readonly result: string }) {
  const isFailure = result === "failure" || result === "failed" || result === "error";
  return (
    <Badge variant={isFailure ? "destructive" : "secondary"} className="font-mono text-xs">
      {result}
    </Badge>
  );
}

function ExpandedDetail({ entry }: { readonly entry: AuditLogEntry }) {
  return (
    <tr>
      <td colSpan={7} className="bg-muted/30 px-6 py-4">
        <div className="text-xs">
          <p className="mb-1.5 font-semibold text-muted-foreground">Full metadata payload</p>
          <pre className="overflow-x-auto rounded border bg-background p-3 text-xs leading-relaxed">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
          {entry.ipAddress && (
            <p className="mt-2 text-muted-foreground">
              IP address: <span className="font-mono text-foreground">{entry.ipAddress}</span>
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AuditLogTable({ entries, pagination, onPageChange }: AuditLogTableProps) {
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Audit log entries">
          <caption className="sr-only">
            Audit log — page {pagination.page} of {pagination.totalPages || 1}, {pagination.total} total entries
          </caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th scope="col" className="w-8 px-4 py-3" aria-label="Expand row" />
              <th scope="col" className="px-4 py-3 font-semibold">Timestamp</th>
              <th scope="col" className="px-4 py-3 font-semibold">Actor</th>
              <th scope="col" className="px-4 py-3 font-semibold">Action</th>
              <th scope="col" className="px-4 py-3 font-semibold">Resource Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Resource ID</th>
              <th scope="col" className="px-4 py-3 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No audit log entries match the current filters.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleRow(entry.id); }}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          className="flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        <time dateTime={entry.createdAt}>
                          {formatDateTime(entry.createdAt, locale as Locale)}
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs truncate max-w-[140px]" title={entry.actorId ?? "—"}>
                            {entry.actorId ?? "—"}
                          </span>
                          <Badge variant="outline" className="w-fit text-xs">
                            {entry.actorType}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        {entry.action}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.resourceType ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]" title={entry.resourceId ?? ""}>
                        {entry.resourceId ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ResultBadge result={entry.result} />
                      </td>
                    </tr>
                    {isExpanded && <ExpandedDetail entry={entry} />}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {pagination.total === 0
            ? "No results"
            : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              )} of ${pagination.total}`}
        </p>
        <div className="flex items-center gap-2" role="navigation" aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
