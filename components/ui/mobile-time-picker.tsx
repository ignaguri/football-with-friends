"use client";

import { ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";

interface MobileTimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

// Generate time slots in 30-minute increments.
// By default, time slots start from 15 (3 PM) to 24 (midnight) as matches are only allowed from 3 PM onwards.
// To change the range, adjust the startHour and endHour parameters.
function generateTimeSlots(
  startHour: number = 15,
  endHour: number = 24,
): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(timeString);
    }
  }
  return slots;
}

export function MobileTimePicker({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  id,
}: MobileTimePickerProps) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const timeSlots = React.useMemo(() => generateTimeSlots(), []);

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
            {value || placeholder || t("addMatch.selectTime")}
            <ClockIcon className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("addMatch.selectTime")}</DrawerTitle>
            <DrawerDescription>{t("addMatch.selectTime")}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {timeSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={value === slot ? "default" : "outline"}
                  onClick={() => {
                    onChange(slot);
                    setOpen(false);
                  }}
                  className="h-14 text-base font-medium"
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
