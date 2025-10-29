"use client";

import { flexRender, type Table as TableType } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlayersTableProps<TData> {
  table: TableType<TData>;
  columnsCount: number;
  isPending: boolean;
}

export function PlayersTable<TData>({
  table,
  columnsCount,
  isPending,
}: PlayersTableProps<TData>) {
  const t = useTranslations();
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const isSorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  onClick={
                    canSort
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                  className={canSort ? "cursor-pointer select-none" : undefined}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {canSort && (
                      <span className="text-xs">
                        {isSorted === "asc"
                          ? "▲"
                          : isSorted === "desc"
                            ? "▼"
                            : ""}
                      </span>
                    )}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isPending ? (
          <TableRow>
            <TableCell colSpan={columnsCount} className="h-24 text-center">
              {t("players.updating")}
            </TableCell>
          </TableRow>
        ) : table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columnsCount}
              className="h-24 text-center text-muted-foreground"
            >
              {t("players.noPlayers")}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
