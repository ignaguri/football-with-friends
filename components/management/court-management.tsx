"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Court, Location } from "@/lib/domain/types";

import { ManagementTable } from "./management-table-simple";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useGetCourts,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
} from "@/hooks/use-courts";
import { useCrudOperations } from "@/hooks/use-crud-operations";
import { useGetLocations } from "@/hooks/use-locations";

interface RawLocation {
  id: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount: number;
  createdAt: string;
  updatedAt: string;
}

const courtSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  name: z.string().min(1, "Court name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type CourtFormValues = z.infer<typeof courtSchema>;

interface CourtManagementProps {
  className?: string;
}

export function CourtManagement({ className }: CourtManagementProps) {
  const t = useTranslations();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: locationsData } = useGetLocations();
  const { data: courtsData, isLoading } = useGetCourts();
  const createCourtMutation = useCreateCourt();
  const updateCourtMutation = useUpdateCourt();
  const deleteCourtMutation = useDeleteCourt();

  const locations: Location[] = (locationsData?.locations || []).map(
    (loc: RawLocation): Location => ({
      ...loc,
      createdAt: new Date(loc.createdAt),
      updatedAt: new Date(loc.updatedAt),
    }),
  );
  const courts: Court[] = courtsData?.courts || [];

  const {
    editingItem,
    itemToDelete,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    requestDelete,
    confirmDelete,
    cancelDelete,
    deleteConfirmMessage,
  } = useCrudOperations({
    createItem: (values: CourtFormValues) =>
      new Promise<Court>((resolve, reject) => {
        createCourtMutation.mutate(values, {
          onSuccess: (data) => resolve(data),
          onError: reject,
        });
      }),
    updateItem: (id: string, values: CourtFormValues) =>
      new Promise<Court>((resolve, reject) => {
        updateCourtMutation.mutate(
          { courtId: id, updates: values },
          {
            onSuccess: (data) => resolve(data),
            onError: reject,
          },
        );
      }),
    deleteItem: (id: string) =>
      new Promise<void>((resolve, reject) => {
        deleteCourtMutation.mutate(id, {
          onSuccess: () => resolve(),
          onError: reject,
        });
      }),
    successMessages: {
      create: t("courts.createSuccess"),
      update: t("courts.updateSuccess"),
      delete: t("courts.deleteSuccess"),
    },
  });

  const form = useForm<CourtFormValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      locationId: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editForm = useForm<CourtFormValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      locationId: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const getLocationName = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.name || t("courts.unknownLocation");
  };

  const columns = [
    {
      key: "locationId" as const,
      label: t("courts.location"),
      render: (court: Court) => getLocationName(court.locationId),
    },
    {
      key: "name" as const,
      label: t("courts.courtName"),
      className: "font-medium",
    },
    {
      key: "description" as const,
      label: t("courts.description"),
      render: (court: Court) => court.description || "-",
    },
    {
      key: "isActive" as const,
      label: t("shared.status"),
      render: (court: Court) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            court.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {court.isActive ? t("courts.active") : t("status.inactive")}
        </span>
      ),
    },
  ];

  const handleCreateSubmit = async (values: CourtFormValues) => {
    await handleCreate(values);
    form.reset();
    setIsCreateDialogOpen(false);
  };

  const handleEditSubmit = async (values: CourtFormValues) => {
    await handleUpdate(values);
    editForm.reset();
  };

  const handleEditClick = (court: Court) => {
    startEdit(court);
    editForm.reset({
      locationId: court.locationId,
      name: court.name,
      description: court.description || "",
      isActive: court.isActive,
    });
  };

  const actions = [
    {
      label: t("courts.edit"),
      variant: "outline" as const,
      onClick: handleEditClick,
    },
    {
      label: t("courts.delete"),
      variant: "destructive" as const,
      onClick: requestDelete,
      disabled: () => deleteCourtMutation.isPending,
    },
  ];

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("courts.title")}</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("courts.title")}</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("courts.addCourt")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("courts.createTitle")}</DialogTitle>
              <DialogDescription>{t("courts.createDesc")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courts.location")}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                        >
                          <option value="">{t("courts.selectLocation")}</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courts.courtName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("courts.courtNamePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courts.description")}</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder={t("courts.descriptionPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("courts.active")}
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {t("courts.activeDesc")}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t("courts.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCourtMutation.isPending}
                  >
                    {createCourtMutation.isPending
                      ? t("courts.creating")
                      : t("courts.create")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <ManagementTable
          items={courts}
          columns={columns}
          actions={actions}
          emptyMessage={t("courts.noCourts")}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={cancelEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("courts.editTitle")}</DialogTitle>
            <DialogDescription>{t("courts.editDesc")}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("courts.location")}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        disabled
                      >
                        <option value={field.value}>
                          {getLocationName(field.value)}
                        </option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("courts.courtName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("courts.courtNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("courts.description")}</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={t("courts.descriptionPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t("courts.active")}
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {t("courts.activeDesc")}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  {t("courts.cancel")}
                </Button>
                <Button type="submit" disabled={updateCourtMutation.isPending}>
                  {updateCourtMutation.isPending
                    ? t("courts.updating")
                    : t("courts.update")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && cancelDelete()}
        title={t("shared.confirmDelete")}
        description={deleteConfirmMessage}
        confirmText={t("shared.delete")}
        cancelText={t("shared.cancel")}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
