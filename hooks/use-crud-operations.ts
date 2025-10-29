import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CrudOperationsConfig<T> {
  createItem: (values: any) => Promise<T>;
  updateItem: (id: string, values: any) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
  errorMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
}

export function useCrudOperations<T extends { id: string }>({
  createItem,
  updateItem,
  deleteItem,
  successMessages = {},
  errorMessages = {},
}: CrudOperationsConfig<T>) {
  const t = useTranslations();
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const defaultSuccessMessages = {
    create: t("shared.createSuccess"),
    update: t("shared.updateSuccess"),
    delete: t("shared.deleteSuccess"),
    ...successMessages,
  };

  const defaultErrorMessages = {
    create: t("shared.createError"),
    update: t("shared.updateError"),
    delete: t("shared.deleteError"),
    ...errorMessages,
  };

  async function handleCreate(values: any) {
    try {
      await createItem(values);
      toast.success(defaultSuccessMessages.create);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : defaultErrorMessages.create,
      );
      throw error;
    }
  }

  async function handleUpdate(values: any) {
    if (!editingItem) return;

    try {
      await updateItem(editingItem.id, values);
      toast.success(defaultSuccessMessages.update);
      setEditingItem(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : defaultErrorMessages.update,
      );
      throw error;
    }
  }

  function requestDelete(item: T) {
    setItemToDelete(item);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;

    try {
      await deleteItem(itemToDelete.id);
      toast.success(defaultSuccessMessages.delete);
      setItemToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : defaultErrorMessages.delete,
      );
      setItemToDelete(null);
      throw error;
    }
  }

  function cancelDelete() {
    setItemToDelete(null);
  }

  function startEdit(item: T) {
    setEditingItem(item);
  }

  function cancelEdit() {
    setEditingItem(null);
  }

  return {
    editingItem,
    itemToDelete,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    requestDelete,
    confirmDelete,
    cancelDelete,
    deleteConfirmMessage: t("shared.deleteConfirm"),
  };
}
