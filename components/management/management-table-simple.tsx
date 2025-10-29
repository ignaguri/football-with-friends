"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, value: unknown) => React.ReactNode;
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
  isLoading?: (item: T) => boolean;
  tooltip?: (item: T) => string | null;
  className?: string;
}

interface ManagementTableProps<T> {
  items: T[];
  columns: Column<T>[];
  actions: Action<T>[];
  emptyMessage?: string;
  emptyStateComponent?: React.ReactNode;
}

export function ManagementTable<T extends { id: string }>({
  items,
  columns,
  actions,
  emptyMessage = "No items found",
  emptyStateComponent,
}: ManagementTableProps<T>) {
  const t = useTranslations();

  function getValue(item: T, key: keyof T | string): unknown {
    if (typeof key === "string" && key.includes(".")) {
      return key
        .split(".")
        .reduce(
          (obj, k) => (obj as Record<string, unknown>)?.[k],
          item as unknown,
        );
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
            {actions.length > 0 && <TableHead>{t("shared.actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
              className="text-center text-muted-foreground"
            >
              {emptyStateComponent || emptyMessage}
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
                  {column.render ? column.render(item, value) : String(value)}
                </TableCell>
              );
            })}
            {actions.length > 0 && (
              <TableCell>
                {/* Desktop: Show all buttons inline */}
                <div className="hidden md:flex space-x-2">
                  {actions.map((action, index) => {
                    const isDisabled = action.disabled?.(item) || false;
                    const tooltip = action.tooltip?.(item);
                    const button = (
                      <Button
                        key={index}
                        variant={action.variant || "outline"}
                        size={action.size || "sm"}
                        onClick={() => action.onClick(item)}
                        disabled={isDisabled}
                        className={action.className}
                      >
                        {action.isLoading?.(item) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {action.label}
                      </Button>
                    );

                    if (isDisabled && tooltip) {
                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent>{tooltip}</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </div>
                {/* Mobile: Show dropdown menu */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, index) => {
                        const isDisabled =
                          action.disabled?.(item) ||
                          action.isLoading?.(item) ||
                          false;
                        const tooltip = action.tooltip?.(item);
                        const label =
                          tooltip && isDisabled
                            ? `${action.label} (${tooltip})`
                            : action.label;

                        return (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => action.onClick(item)}
                            disabled={isDisabled}
                            className={action.className}
                          >
                            {action.isLoading?.(item) && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
