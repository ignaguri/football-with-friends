"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, value: any) => React.ReactNode;
  className?: string;
}

interface Action<T> {
  label: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick: (item: T) => void;
  disabled?: (item: T) => boolean;
  className?: string;
}

interface ManagementTableProps<T> {
  items: T[];
  columns: Column<T>[];
  actions: Action<T>[];
  emptyMessage?: string;
}

export function ManagementTable<T extends { id: string }>({
  items,
  columns,
  actions,
  emptyMessage = "No items found",
}: ManagementTableProps<T>) {
  function getValue(item: T, key: keyof T | string): any {
    if (typeof key === "string" && key.includes(".")) {
      return key.split(".").reduce((obj, k) => obj?.[k], item as any);
    }
    return item[key as keyof T];
  }

  if (items.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index}>{column.label}</TableHead>
            ))}
            {actions.length > 0 && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
              className="text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index}>{column.label}</TableHead>
          ))}
          {actions.length > 0 && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            {columns.map((column, index) => {
              const value = getValue(item, column.key);
              return (
                <TableCell key={index} className={column.className}>
                  {column.render ? column.render(item, value) : value}
                </TableCell>
              );
            })}
            {actions.length > 0 && (
              <TableCell>
                <div className="flex space-x-2">
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || "outline"}
                      size={action.size || "sm"}
                      onClick={() => action.onClick(item)}
                      disabled={action.disabled?.(item) || false}
                      className={action.className}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
