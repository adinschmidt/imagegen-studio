"use client";

import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QueueItem, QueueItemStatus } from "@/lib/types";

interface GenerationQueueProps {
  queue: QueueItem[];
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

const STATUS_CONFIG: Record<
  QueueItemStatus,
  { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "outline"; icon: typeof Clock }
> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  running: { label: "Running", variant: "warning", icon: Loader2 },
  completed: { label: "Done", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
};

export function GenerationQueue({
  queue,
  onCancel,
  onClearCompleted,
  onClearAll,
}: GenerationQueueProps) {
  if (queue.length === 0) return null;

  const hasFinished = queue.some(
    (i) =>
      i.status === "completed" ||
      i.status === "failed" ||
      i.status === "cancelled",
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Queue{" "}
          <span className="text-[var(--muted-foreground)]">
            ({queue.length})
          </span>
        </h3>
        <div className="flex gap-1">
          {hasFinished && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onClearCompleted}
            >
              Clear done
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[var(--destructive-foreground)]"
            onClick={onClearAll}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {queue.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-2"
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  item.status === "running" ? "animate-spin" : ""
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs line-clamp-1 font-medium">
                    {item.request.prompt}
                  </p>
                  {item.request.referenceImages &&
                    item.request.referenceImages.length > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {item.request.referenceImages.map((src, i) => (
                          <div
                            key={`ref-${item.id}-${i}`}
                            className="h-5 w-5 overflow-hidden rounded border border-[var(--border)]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Reference ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                    {cfg.label}
                  </Badge>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {item.completedCount}/{item.imagesPerPrompt} images
                  </span>
                  {item.status === "running" && item.attempt > 0 && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      · attempt {item.attempt}/{item.maxRetries}
                    </span>
                  )}
                  {item.error && (
                    <span className="text-[10px] text-red-400 line-clamp-1">
                      · {item.error}
                    </span>
                  )}
                </div>
              </div>
              {(item.status === "pending" || item.status === "running") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onCancel(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
