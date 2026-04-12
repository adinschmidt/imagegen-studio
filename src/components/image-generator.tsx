"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { AppSettings, StoredImage } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { hashDataUrl } from "@/lib/image-hash";
import { loadSettings, saveSettings } from "@/lib/storage";
import { useImageStorage } from "@/hooks/use-image-storage";
import { usePromptHistory } from "@/hooks/use-prompt-history";
import { useGenerationQueue } from "@/hooks/use-generation-queue";
import { SettingsPanel } from "@/components/settings-panel";
import { PromptInput } from "@/components/prompt-input";
import { ImageDropZone } from "@/components/image-drop-zone";
import { ImageGallery } from "@/components/image-gallery";
import { ImageCarousel } from "@/components/image-carousel";
import { GenerationQueue } from "@/components/generation-queue";
import { RecentlyDeleted } from "@/components/recently-deleted";

export function ImageGenerator() {
  /* ── State ─────────────────────────────────────────────────────── */
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  // Persist settings on change
  const handleSettingsChange = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  /* ── Hooks ─────────────────────────────────────────────────────── */
  const {
    images,
    deletedImages,
    isLoading,
    addImages,
    removeImage,
    clearImages,
    restore,
    permanentlyDelete,
    clearDeleted,
  } = useImageStorage();
  const { history, addPrompt } = usePromptHistory();
  const { queue, enqueue, cancelItem, clearCompleted, clearAll } =
    useGenerationQueue({
      onImagesGenerated: addImages,
    });

  /* ── Handlers ──────────────────────────────────────────────────── */

  const handleGenerate = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;

    const apiKey = settings.apiKeys[settings.provider] ?? "";
    if (!apiKey) {
      toast.error("API key missing", {
        description: `Please set an API key for ${settings.provider} in Connection Settings.`,
      });
      return;
    }

    addPrompt(text);

    enqueue(
      {
        prompt: text,
        provider: settings.provider,
        model: settings.model,
        customModelId: settings.customModelId || undefined,
        aspectRatio: settings.aspectRatio,
        quality: settings.quality,
        resolution: settings.resolution || undefined,
        apiKey,
        baseUrl: settings.customBaseUrl || undefined,
        proxy: settings.proxy || undefined,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      },
      settings.retries,
      settings.imagesPerPrompt,
    );
  }, [prompt, settings, referenceImages, addPrompt, enqueue]);

  const handleDownload = useCallback((image: StoredImage) => {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    const ext = image.dataUrl.startsWith("data:image/webp") ? "webp" : "png";
    link.download = `imagegen-${image.id}.${ext}`;
    link.click();
    toast.success("Image downloaded");
  }, []);

  const handleAddAsReference = useCallback(
    async (image: StoredImage) => {
      if (referenceImages.length >= 5) {
        toast.warning("Reference limit reached", {
          description: "You can use up to 5 reference images.",
        });
        return;
      }

      // Duplicate check based on image hash
      const newHash = await hashDataUrl(image.dataUrl);
      const existingHashes = await Promise.all(
        referenceImages.map(hashDataUrl),
      );
      if (existingHashes.includes(newHash)) {
        toast.warning("Duplicate image", {
          description: "This image is already added as a reference.",
        });
        return;
      }

      setReferenceImages((prev) => [...prev, image.dataUrl]);
      toast.success("Added as reference image");
    },
    [referenceImages],
  );

  const isProcessing = queue.some(
    (q) => q.status === "pending" || q.status === "running",
  );

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── LEFT PANEL: Settings + Prompt ─────────────────────── */}
        <div className="w-full space-y-5 lg:w-[400px] lg:shrink-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-[var(--muted-foreground)]">
              Settings
            </h2>
            <SettingsPanel
              settings={settings}
              onChange={handleSettingsChange}
              referenceImage={referenceImages[0]}
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-4">
            <ImageDropZone
              images={referenceImages}
              onChange={setReferenceImages}
            />

            <div className="border-t border-[var(--border)] pt-4">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onSubmit={handleGenerate}
                isProcessing={isProcessing}
                history={history}
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Queue + Gallery ──────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {queue.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <GenerationQueue
                queue={queue}
                onCancel={cancelItem}
                onClearCompleted={clearCompleted}
                onClearAll={clearAll}
              />
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <ImageGallery
              images={images}
              isLoading={isLoading}
              deletedCount={deletedImages.length}
              onImageClick={setCarouselIndex}
              onAddAsReference={handleAddAsReference}
              onDownload={handleDownload}
              onRemove={removeImage}
              onOpenDeleted={() => setDeletedOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Carousel overlay ──────────────────────────────────── */}
      {carouselIndex !== null && images[carouselIndex] && (
        <ImageCarousel
          images={images}
          currentIndex={carouselIndex}
          onIndexChange={setCarouselIndex}
          onClose={() => setCarouselIndex(null)}
          onAddAsReference={handleAddAsReference}
          onDownload={handleDownload}
        />
      )}

      {/* ── Recently Deleted dialog ──────────────────────────── */}
      <RecentlyDeleted
        open={deletedOpen}
        onOpenChange={setDeletedOpen}
        deletedImages={deletedImages}
        onRestore={restore}
        onPermanentlyDelete={permanentlyDelete}
      />
    </>
  );
}
