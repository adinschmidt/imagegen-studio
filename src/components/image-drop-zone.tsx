"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { hashDataUrl } from "@/lib/image-hash";
import { Button } from "@/components/ui/button";

const REFERENCE_IMAGE_OPTIMIZATION_STEPS = [
  { maxDimension: 2048, quality: 0.9 },
  { maxDimension: 1536, quality: 0.82 },
  { maxDimension: 1280, quality: 0.75 },
] as const;
const MAX_REFERENCE_DATA_URL_CHARS = 2_000_000;

interface ImageDropZoneProps {
  images: string[]; // data-URL strings
  onChange: (images: string[]) => void;
  maxImages?: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function optimizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      readFileAsDataUrl(file).then(resolve).catch(reject);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        let best = await readFileAsDataUrl(file);

        for (const step of REFERENCE_IMAGE_OPTIMIZATION_STEPS) {
          const scale = Math.min(1, step.maxDimension / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.drawImage(img, 0, 0, width, height);
          const candidate = canvas.toDataURL("image/webp", step.quality);

          if (candidate.length < best.length) {
            best = candidate;
          }
          if (best.length <= MAX_REFERENCE_DATA_URL_CHARS) {
            break;
          }
        }

        resolve(best);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        resolve(await readFileAsDataUrl(file));
      } catch (err) {
        reject(err);
      }
    };

    img.src = objectUrl;
  });
}

export function ImageDropZone({
  images,
  onChange,
  maxImages = 5,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;

      const toProcess = Array.from(files).slice(0, remaining);
      const readers = toProcess.map(
        async (file) => {
          const optimized = await optimizeImageFile(file);
          if (optimized.length > MAX_REFERENCE_DATA_URL_CHARS) {
            throw new Error(
              `${file.name} is still too large after optimization. Use a smaller image.`,
            );
          }
          return optimized;
        },
      );

      Promise.all(readers)
        .then(async (results) => {
          // Hash existing images to detect duplicates
          const existingHashes = new Set(
            await Promise.all(images.map(hashDataUrl)),
          );

          const unique: string[] = [];
          let duplicateCount = 0;

          for (const result of results) {
            const hash = await hashDataUrl(result);
            if (existingHashes.has(hash)) {
              duplicateCount++;
              continue;
            }
            existingHashes.add(hash); // also dedup within the batch
            unique.push(result);
          }

          if (duplicateCount > 0) {
            toast.warning(
              duplicateCount === 1
                ? "Duplicate image skipped"
                : `${duplicateCount} duplicate images skipped`,
              { description: "This image has already been added as a reference." },
            );
          }

          if (unique.length > 0) {
            onChange([...images, ...unique]);
          }
        })
        .catch((err) => {
          toast.error("Could not add reference image", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        });
    },
    [images, onChange, maxImages],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">
        Reference Images{" "}
        <span className="text-[var(--muted-foreground)] font-normal">
          (optional)
        </span>
      </label>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
        } ${images.length >= maxImages ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload className="h-5 w-5 text-[var(--muted-foreground)]" />
        <p className="text-xs text-center text-[var(--muted-foreground)]">
          Drop images here or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div
              key={`ref-${i}`}
              className="group relative h-16 w-16 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Reference ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)] transition-colors"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
