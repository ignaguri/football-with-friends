"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Location } from "@/lib/domain/types";

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
import { useCrudOperations } from "@/hooks/use-crud-operations";
import {
  useGetLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/hooks/use-locations";

interface RawLocation {
  id: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount: number;
  createdAt: string;
  updatedAt: string;
}

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  coordinates: z.string().optional(),
  courtCount: z
    .number()
    .min(1, "Court count must be at least 1")
    .max(50, "Court count cannot exceed 50"),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationManagementProps {
  onLocationChange?: () => void;
  className?: string;
}

export function LocationManagement({
  onLocationChange,
  className,
}: LocationManagementProps) {
  const t = useTranslations();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    error: locationsError,
  } = useGetLocations();

  const { mutate: createLocation, isPending: isCreating } = useCreateLocation();
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateLocation();
  const { mutate: deleteLocation, isPending: isDeleting } = useDeleteLocation();

  const locations = (locationsData?.locations || []).map(
    (loc: RawLocation): Location => ({
      ...loc,
      createdAt: new Date(loc.createdAt),
      updatedAt: new Date(loc.updatedAt),
    }),
  );

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
    createItem: (values: LocationFormValues) =>
      new Promise<Location>((resolve, reject) => {
        createLocation(values, {
          onSuccess: (data) => {
            onLocationChange?.();
            resolve(data);
          },
          onError: reject,
        });
      }),
    updateItem: (id: string, values: LocationFormValues) =>
      new Promise<Location>((resolve, reject) => {
        updateLocation(
          { locationId: id, updates: values },
          {
            onSuccess: (data) => {
              onLocationChange?.();
              resolve(data);
            },
            onError: reject,
          },
        );
      }),
    deleteItem: (id: string) =>
      new Promise<void>((resolve, reject) => {
        deleteLocation(id, {
          onSuccess: () => {
            onLocationChange?.();
            resolve();
          },
          onError: reject,
        });
      }),
    successMessages: {
      create: t("locations.createSuccess"),
      update: t("locations.updateSuccess"),
      delete: t("locations.deleteSuccess"),
    },
  });

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      coordinates: "",
      courtCount: 1,
    },
  });

  const editForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      coordinates: "",
      courtCount: 1,
    },
  });

  const columns = [
    {
      key: "name" as const,
      label: t("locations.name"),
      className: "font-medium",
    },
    {
      key: "address" as const,
      label: t("locations.address"),
      render: (location: Location) => location.address || "-",
    },
    {
      key: "courtCount" as const,
      label: t("locations.courtCount"),
    },
  ];

  const handleCreateSubmit = async (values: LocationFormValues) => {
    await handleCreate(values);
    form.reset();
    setIsCreateDialogOpen(false);
  };

  const handleEditSubmit = async (values: LocationFormValues) => {
    await handleUpdate(values);
    editForm.reset();
  };

  const handleEditClick = (location: Location) => {
    startEdit(location);
    editForm.reset({
      name: location.name,
      address: location.address || "",
      coordinates: location.coordinates || "",
      courtCount: location.courtCount,
    });
  };

  const actions = [
    {
      label: t("organizer.edit"),
      variant: "outline" as const,
      onClick: handleEditClick,
    },
    {
      label: t("organizer.delete"),
      variant: "destructive" as const,
      onClick: requestDelete,
      disabled: () => isDeleting,
    },
  ];

  if (isLoadingLocations) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("locations.title")}</h2>
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

  if (locationsError) {
    return (
      <div className={className}>
        <div className="p-8 text-center">
          <p className="text-red-600">
            {t("locations.error", { message: locationsError.message })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("locations.title")}</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("locations.addLocation")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("locations.addLocation")}</DialogTitle>
              <DialogDescription>
                {t("locations.addLocationDesc")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("locations.name")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("locations.namePlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("locations.address")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("locations.addressPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coordinates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("locations.coordinates")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("locations.coordinatesPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="courtCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("locations.courtCount")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="50"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t("shared.cancel")}
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating
                      ? t("locations.creating")
                      : t("locations.create")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <ManagementTable
          items={locations}
          columns={columns}
          actions={actions}
          emptyMessage={t("locations.noLocations")}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={cancelEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("locations.editLocation")}</DialogTitle>
            <DialogDescription>
              {t("locations.editLocationDesc")}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("locations.name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("locations.namePlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("locations.address")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("locations.addressPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="coordinates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("locations.coordinates")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("locations.coordinatesPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="courtCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("locations.courtCount")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="50"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  {t("shared.cancel")}
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? t("locations.updating") : t("locations.update")}
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
