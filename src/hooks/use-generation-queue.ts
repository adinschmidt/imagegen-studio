"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type {
  GenerationRequest,
  GenerationResponse,
  QueueItem,
  QueueItemStatus,
  StoredImage,
} from "@/lib/types";
import { generateThumbnail } from "@/lib/storage";

const GENERATION_REQUEST_TIMEOUT_MS = 180_000;

interface UseGenerationQueueOptions {
  onImagesGenerated: (images: StoredImage[]) => Promise<void>;
}

export function useGenerationQueue({ onImagesGenerated }: UseGenerationQueueOptions) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const processingRef = useRef(false);
  const queueRef = useRef(queue);

  // Keep ref in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process queue whenever it changes
  useEffect(() => {
    processNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  const updateItem = useCallback(
    (id: string, update: Partial<QueueItem>) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...update } : item)),
      );
    },
    [],
  );

  async function processNext() {
    if (processingRef.current) return;

    const next = queueRef.current.find((i) => i.status === "pending");
    if (!next) return;

    processingRef.current = true;
    updateItem(next.id, { status: "running", startedAt: Date.now() });

    let allResults: StoredImage[] = [];
    let lastError: string | undefined;
    let completedCount = 0;

    // Generate imagesPerPrompt images (each as a separate API call)
    for (let imgIdx = 0; imgIdx < next.imagesPerPrompt; imgIdx++) {
      let success = false;

      for (
        let attempt = 1;
        attempt <= next.maxRetries && !success;
        attempt++
      ) {
        updateItem(next.id, { attempt, completedCount });

        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => {
            controller.abort(new DOMException("Generation request timed out", "AbortError"));
          }, GENERATION_REQUEST_TIMEOUT_MS);

          let res: Response;
          try {
            res = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(next.request),
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(timeoutId);
          }

          const data: GenerationResponse = await res.json();

          if (!res.ok || data.error) {
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }

          if (data.images.length > 0) {
            const stored: StoredImage[] = [];
            for (const img of data.images) {
              const dataUrl = `data:${img.mimeType};base64,${img.base64}`;
              const thumbnailDataUrl = await generateThumbnail(dataUrl);
              const storedImg: StoredImage = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                dataUrl,
                thumbnailDataUrl,
                prompt: next.request.prompt,
                provider: next.request.provider,
                model: next.request.customModelId || next.request.model,
                aspectRatio: next.request.aspectRatio,
                quality: next.request.quality,
                resolution: next.request.resolution,
                createdAt: Date.now(),
              };
              stored.push(storedImg);
            }
            allResults = [...allResults, ...stored];
            await onImagesGenerated(stored);
            success = true;
            completedCount++;
            lastError = undefined;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            lastError = `Request timed out after ${Math.floor(GENERATION_REQUEST_TIMEOUT_MS / 1000)}s`;
          } else {
            lastError = err instanceof Error ? err.message : String(err) || "Unknown error";
          }
          console.error(
            `[queue] Attempt ${attempt}/${next.maxRetries} for item ${next.id} image ${imgIdx + 1}:`,
            lastError,
          );

          // Wait before retry (exponential backoff)
          if (attempt < next.maxRetries) {
            await new Promise((r) =>
              setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 10000)),
            );
          }
        }
      }

      if (!success) {
        // This particular image iteration failed all retries — continue to next
        completedCount++;
      }
    }

    const finalStatus: QueueItemStatus =
      allResults.length > 0
        ? lastError
          ? "completed" // partial success
          : "completed"
        : "failed";

    updateItem(next.id, {
      status: finalStatus,
      results: allResults,
      completedCount,
      error: lastError,
      finishedAt: Date.now(),
    });

    // Notify the user
    if (finalStatus === "completed") {
      const count = allResults.length;
      toast.success(
        `Generated ${count} image${count !== 1 ? "s" : ""}`,
        { description: next.request.prompt.slice(0, 80) },
      );
    } else {
      toast.error("Generation failed", {
        description: lastError ?? "All retries exhausted.",
      });
    }

    processingRef.current = false;

    // Check for more items
    setTimeout(() => processNext(), 50);
  }

  const enqueue = useCallback(
    (
      request: GenerationRequest,
      maxRetries: number,
      imagesPerPrompt: number,
    ) => {
      const item: QueueItem = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        request,
        status: "pending",
        attempt: 0,
        maxRetries: Math.max(1, maxRetries),
        imagesPerPrompt: Math.max(1, imagesPerPrompt),
        completedCount: 0,
        results: [],
        createdAt: Date.now(),
      };
      setQueue((prev) => [...prev, item]);
      return item.id;
    },
    [],
  );

  const cancelItem = useCallback(
    (id: string) => {
      updateItem(id, { status: "cancelled", finishedAt: Date.now() });
    },
    [updateItem],
  );

  const clearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter(
        (i) =>
          i.status !== "completed" &&
          i.status !== "failed" &&
          i.status !== "cancelled",
      ),
    );
  }, []);

  const clearAll = useCallback(() => {
    setQueue([]);
    processingRef.current = false;
  }, []);

  return { queue, enqueue, cancelItem, clearCompleted, clearAll };
}
