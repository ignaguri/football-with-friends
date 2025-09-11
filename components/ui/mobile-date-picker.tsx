"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { format, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

interface MobileDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function MobileDatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  disabled = false,
  required = false,
  id,
}: MobileDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-full justify-between font-normal h-12"
            disabled={disabled}
          >
            {value ? format(value, "PPP") : placeholder}
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="w-auto overflow-hidden p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select date</DrawerTitle>
            <DrawerDescription>Choose a date for your match</DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            selected={value}
            captionLayout="dropdown"
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            className="mx-auto [--cell-size:3rem] text-sm sm:text-base"
            disabled={[{ before: new Date() }]}
            startMonth={subMonths(new Date(), 1)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}
