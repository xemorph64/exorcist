import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Empty } from "./ui/primitives";
import { useStore } from "@/store/useStore";

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  globalFilter,
  initialSort,
  empty,
  rowClassName,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  onRowClick?: (row: T) => void;
  globalFilter?: string;
  initialSort?: SortingState;
  empty?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const compact = useStore((s) => s.settings.compactTables);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((h) => {
                const sortable = h.column.getCanSort();
                const dir = h.column.getIsSorted();
                return (
                  <th key={h.id} className="h-9 whitespace-nowrap px-4 text-[11px] font-medium text-subtle" style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}>
                    {sortable ? (
                      <button onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-fg">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === "asc" ? <ArrowUp className="size-3" /> : dir === "desc" ? <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={onRowClick ? () => onRowClick(r.original) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(r.original) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-hover/50 focus:bg-hover/50 focus:outline-none", rowClassName?.(r.original))}
            >
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className={cn("px-4 text-[13px]", compact ? "py-1.5" : "py-2.5")}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (empty ?? <Empty title="No rows match these filters" body="Clear the search or filters to see everything." />)}
    </div>
  );
}
