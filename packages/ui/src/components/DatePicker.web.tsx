import { useState, useMemo } from "react";
import {
  YStack,
  XStack,
  Text,
  Button,
  Dialog as TamaguiDialog,
  styled,
} from "tamagui";
import { Calendar, ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
}

const DayButton = styled(Button, {
  width: 36,
  height: 36,
  padding: 0,
  borderRadius: "$3",
  variants: {
    isSelected: {
      true: {
        backgroundColor: "$blue10",
      },
    },
    isToday: {
      true: {
        borderWidth: 2,
        borderColor: "$blue8",
      },
    },
    isOutside: {
      true: {
        opacity: 0.3,
      },
    },
    isDisabled: {
      true: {
        opacity: 0.3,
        pointerEvents: "none",
      },
    },
  } as const,
});

const WeekdayLabel = styled(Text, {
  width: 36,
  textAlign: "center",
  fontSize: "$2",
  color: "$gray10",
  fontWeight: "600",
});

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  error,
  disabled = false,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());

  const today = useMemo(() => startOfDay(new Date()), []);
  const effectiveMinDate = minDate || today;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const handleSelectDate = (date: Date) => {
    onChange(date);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isPrevDisabled = isBefore(
    endOfMonth(subMonths(currentMonth, 1)),
    effectiveMinDate
  );

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}

      <TamaguiDialog modal open={open} onOpenChange={setOpen}>
        <TamaguiDialog.Trigger asChild>
          <Button
            disabled={disabled}
            backgroundColor="$background"
            borderColor={error ? "$red8" : "$borderColor"}
            borderWidth={1}
            borderRadius="$4"
            paddingHorizontal="$3"
            paddingVertical="$3"
            opacity={disabled ? 0.5 : 1}
            justifyContent="flex-start"
            pressStyle={{ opacity: 0.8 }}
          >
            <XStack alignItems="center" gap="$3" flex={1}>
              <Calendar size={20} color="$gray10" />
              <Text flex={1} color={value ? "$color" : "$gray10"} fontSize="$4">
                {value ? format(value, "EEE, MMM d, yyyy") : placeholder}
              </Text>
            </XStack>
          </Button>
        </TamaguiDialog.Trigger>

        <TamaguiDialog.Portal>
          <TamaguiDialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <TamaguiDialog.Content
            bordered
            elevate
            key="content"
            animateOnly={["transform", "opacity"]}
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ y: 10, opacity: 0, scale: 0.95 }}
            padding="$4"
            backgroundColor="$background"
            borderRadius="$6"
            width={320}
          >
            <YStack gap="$3">
              {/* Month navigation */}
              <XStack justifyContent="space-between" alignItems="center">
                <Button
                  size="$3"
                  circular
                  icon={ChevronLeft}
                  onPress={handlePrevMonth}
                  disabled={isPrevDisabled}
                  opacity={isPrevDisabled ? 0.3 : 1}
                />
                <Text fontSize="$5" fontWeight="600">
                  {format(currentMonth, "MMMM yyyy")}
                </Text>
                <Button
                  size="$3"
                  circular
                  icon={ChevronRight}
                  onPress={handleNextMonth}
                />
              </XStack>

              {/* Weekday headers */}
              <XStack justifyContent="space-between" paddingHorizontal="$1">
                {weekdays.map((day) => (
                  <WeekdayLabel key={day}>{day}</WeekdayLabel>
                ))}
              </XStack>

              {/* Calendar grid */}
              <YStack gap="$1">
                {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
                  (_, weekIndex) => (
                    <XStack
                      key={weekIndex}
                      justifyContent="space-between"
                      paddingHorizontal="$1"
                    >
                      {calendarDays
                        .slice(weekIndex * 7, (weekIndex + 1) * 7)
                        .map((day) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = value && isSameDay(day, value);
                          const isTodayDate = isSameDay(day, today);
                          const isBeforeMin = isBefore(day, effectiveMinDate);

                          return (
                            <DayButton
                              key={day.toISOString()}
                              onPress={() => handleSelectDate(day)}
                              isSelected={isSelected}
                              isToday={isTodayDate && !isSelected}
                              isOutside={!isCurrentMonth}
                              isDisabled={isBeforeMin}
                            >
                              <Text
                                color={
                                  isSelected
                                    ? "white"
                                    : isCurrentMonth
                                    ? "$color"
                                    : "$gray8"
                                }
                                fontSize="$3"
                                fontWeight={isTodayDate ? "700" : "400"}
                              >
                                {format(day, "d")}
                              </Text>
                            </DayButton>
                          );
                        })}
                    </XStack>
                  )
                )}
              </YStack>

              {/* Quick actions */}
              <XStack gap="$2" justifyContent="center" marginTop="$2">
                <Button
                  size="$3"
                  onPress={() => {
                    setCurrentMonth(today);
                    handleSelectDate(today);
                  }}
                >
                  Today
                </Button>
                <TamaguiDialog.Close asChild>
                  <Button size="$3" variant="outlined">
                    Cancel
                  </Button>
                </TamaguiDialog.Close>
              </XStack>
            </YStack>
          </TamaguiDialog.Content>
        </TamaguiDialog.Portal>
      </TamaguiDialog>

      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}
