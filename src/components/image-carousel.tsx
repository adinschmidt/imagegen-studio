"use client";

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ImagePlus,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredImage } from "@/lib/types";

interface ImageCarouselProps {
  images: StoredImage[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onAddAsReference: (image: StoredImage) => void;
  onDownload: (image: StoredImage) => void;
}

export function ImageCarousel({
  images,
  currentIndex,
  onIndexChange,
  onClose,
  onAddAsReference,
  onDownload,
}: ImageCarouselProps) {
  const current = images[currentIndex];
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) onIndexChange(currentIndex + 1);
  }, [currentIndex, images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onIndexChange(currentIndex - 1);
  }, [currentIndex, onIndexChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [goPrev, goNext, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  // Auto-scroll the thumbnail strip to keep the active thumb visible
  useEffect(() => {
    const el = thumbRefs.current.get(currentIndex);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  if (!current) return null;

  function handleCopyPrompt() {
    navigator.clipboard.writeText(current.prompt);
    toast.success("Prompt copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <span className="text-sm text-white/60">
            {currentIndex + 1} / {images.length}
          </span>
          <span className="text-sm text-white/40">·</span>
          <span className="text-sm text-white/60">
            {current.provider} · {current.model}
          </span>
          {current.prompt && (
            <>
              <span className="text-sm text-white/40">·</span>
              <span className="text-sm text-white/50 truncate max-w-[40vw]">
                {current.prompt}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleCopyPrompt}
            title="Copy prompt"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => onAddAsReference(current)}
            title="Add as reference"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => onDownload(current)}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main image display */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden min-h-0">
        {/* Left arrow */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:bg-black/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <div className="flex h-full w-full items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.dataUrl}
            alt={current.prompt}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Right arrow */}
        {currentIndex < images.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:bg-black/70 hover:text-white transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Prompt bar */}
      <div className="border-t border-white/10 px-4 py-2">
        <p className="text-sm text-white/80 line-clamp-2">{current.prompt}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
          <span>{current.aspectRatio}</span>
          {current.quality && (
            <>
              <span>·</span>
              <span>{current.quality}</span>
            </>
          )}
          <span>·</span>
          <span>{new Date(current.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="border-t border-white/10 bg-black/80">
          <div
            ref={thumbStripRef}
            className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                ref={(el) => {
                  if (el) thumbRefs.current.set(index, el);
                  else thumbRefs.current.delete(index);
                }}
                type="button"
                onClick={() => onIndexChange(index)}
                className={`relative shrink-0 h-16 w-16 rounded-md overflow-hidden transition-all ${
                  index === currentIndex
                    ? "ring-2 ring-white ring-offset-1 ring-offset-black/80 opacity-100"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailDataUrl}
                  alt={image.prompt}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
