"use client";

import { Trash2, RotateCcw, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { DeletedImage } from "@/lib/storage";

interface RecentlyDeletedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletedImages: DeletedImage[];
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
}

function timeAgo(epoch: number): string {
  const seconds = Math.floor((Date.now() - epoch) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentlyDeleted({
  open,
  onOpenChange,
  deletedImages,
  onRestore,
  onPermanentlyDelete,
}: RecentlyDeletedProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Recently Deleted
          </DialogTitle>
          <DialogDescription>
            Your last {deletedImages.length} deleted{" "}
            {deletedImages.length === 1 ? "image" : "images"}. Restore them or
            delete permanently.
          </DialogDescription>
        </DialogHeader>

        {deletedImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">
              No recently deleted images.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 pb-2">
                {deletedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.thumbnailDataUrl}
                      alt={image.prompt}
                      className="h-full w-full object-cover opacity-60"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 opacity-0 group-hover:bg-black/60 group-hover:opacity-100 transition-all">
                      <button
                        type="button"
                        onClick={() => onRestore(image.id)}
                        className="flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-white transition-colors"
                        title="Restore image"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => onPermanentlyDelete(image.id)}
                        className="flex items-center gap-1 rounded-md bg-red-600/90 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>

                    {/* Time label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                      <p className="truncate text-[10px] text-white/70">
                        {timeAgo(image.deletedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
