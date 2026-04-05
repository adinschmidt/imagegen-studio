"use client";

import { ImageIcon, Trash2, Download, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredImage } from "@/lib/types";

interface ImageGalleryProps {
  images: StoredImage[];
  isLoading: boolean;
  deletedCount: number;
  onImageClick: (index: number) => void;
  onAddAsReference: (image: StoredImage) => void;
  onDownload: (image: StoredImage) => void;
  onRemove: (id: string) => void;
  onOpenDeleted: () => void;
}

export function ImageGallery({
  images,
  isLoading,
  deletedCount,
  onImageClick,
  onAddAsReference,
  onDownload,
  onRemove,
  onOpenDeleted,
}: ImageGalleryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <ImageIcon className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
        <h3 className="text-sm font-medium">No images yet</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Generate images to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Recent images{" "}
          <span className="text-[var(--muted-foreground)]">
            ({images.length})
          </span>
        </h3>
        <div className="flex items-center gap-1">
          {deletedCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenDeleted}>
              <Trash2 className="mr-1 h-3 w-3" />
              Deleted ({deletedCount})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]"
            onClick={() => onImageClick(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumbnailDataUrl}
              alt={image.prompt}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 flex flex-col justify-between bg-black/0 group-hover:bg-black/50 transition-colors pointer-events-none group-hover:pointer-events-auto">
              {/* Top-right actions */}
              <div className="flex justify-end gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAsReference(image);
                  }}
                  className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                  title="Add as reference image"
                >
                  <ImagePlus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(image);
                  }}
                  className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>

              {/* Bottom prompt preview */}
              <div className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="line-clamp-2 text-[10px] leading-tight text-white/90">
                  {image.prompt}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
