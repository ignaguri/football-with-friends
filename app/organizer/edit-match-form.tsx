import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Define Match type locally
interface Match {
  matchId: string;
  date: string;
  time: string;
  courtNumber: string;
  status: string;
  costCourt: string;
  costShirts: string;
}

const matchSchema = z.object({
  matchId: z.string(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  courtNumber: z.string(),
  status: z.string(),
  costCourt: z.string(),
  costShirts: z.string(),
});

type EditMatchFormProps = {
  match: Match;
  onSave: (match: Match) => void;
  onCancel: () => void;
};

// Helper functions to normalize date and time formats
function normalizeDate(date: string) {
  // Always return YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  // If not in correct format, try to parse and reformat
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return date;
}

function normalizeTime(time: string) {
  // Handles 'H:mm' or 'HH:mm'
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function EditMatchForm({ match, onSave, onCancel }: EditMatchFormProps) {
  const form = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      ...match,
      date: normalizeDate(match.date),
      time: normalizeTime(match.time),
    },
    mode: "onChange",
  });

  function onSubmit(values: z.infer<typeof matchSchema>) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-4"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="courtNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Court Number</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costCourt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost (Court)</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costShirts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost (Shirts)</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DrawerFooter>
          <Button
            type="submit"
            variant="default"
            disabled={!form.formState.isValid}
          >
            Save
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </form>
    </Form>
  );
}
