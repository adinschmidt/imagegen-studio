"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoredImage } from "@/lib/types";
import type { DeletedImage } from "@/lib/storage";
import {
  getAllImages,
  saveImages,
  deleteImage,
  clearAllImages,
  getDeletedImages,
  restoreImage,
  permanentlyDeleteImage,
  clearDeletedImages,
} from "@/lib/storage";

export function useImageStorage() {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [deletedImages, setDeletedImages] = useState<DeletedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDeleted = useCallback(async () => {
    try {
      const deleted = await getDeletedImages();
      setDeletedImages(deleted);
    } catch (err) {
      console.error("[storage] Failed to refresh deleted images:", err);
    }
  }, []);

  // Load images from IndexedDB on mount.
  // Loaded independently so a failure in the deleted-images store
  // (e.g. first run after the DB upgrade) can't break primary images.
  useEffect(() => {
    getAllImages()
      .then(setImages)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    getDeletedImages()
      .then(setDeletedImages)
      .catch(console.error);
  }, []);

  const addImages = useCallback(async (newImages: StoredImage[]) => {
    await saveImages(newImages);
    const all = await getAllImages();
    setImages(all);
  }, []);

  const removeImage = useCallback(
    async (id: string) => {
      await deleteImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      await refreshDeleted();
    },
    [refreshDeleted],
  );

  const clearImages = useCallback(async () => {
    await clearAllImages();
    setImages([]);
    await refreshDeleted();
  }, [refreshDeleted]);

  const restore = useCallback(
    async (id: string) => {
      await restoreImage(id);
      const all = await getAllImages();
      setImages(all);
      await refreshDeleted();
    },
    [refreshDeleted],
  );

  const permanentlyDelete = useCallback(
    async (id: string) => {
      await permanentlyDeleteImage(id);
      await refreshDeleted();
    },
    [refreshDeleted],
  );

  const clearDeleted = useCallback(async () => {
    await clearDeletedImages();
    setDeletedImages([]);
  }, []);

  return {
    images,
    deletedImages,
    isLoading,
    addImages,
    removeImage,
    clearImages,
    restore,
    permanentlyDelete,
    clearDeleted,
  };
}
