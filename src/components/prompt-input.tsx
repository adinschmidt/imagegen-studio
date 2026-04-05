"use client";

import { useState, useRef, useEffect } from "react";
import { Wand2, History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  disabled?: boolean;
  history: string[];
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isProcessing,
  disabled,
  history,
}: PromptInputProps) {
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close history dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        historyRef.current &&
        !historyRef.current.contains(e.target as Node)
      ) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  function selectFromHistory(prompt: string) {
    onChange(prompt);
    setShowHistory(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Describe the image you want to generate..."
          className="min-h-[100px] resize-none pr-10 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* History dropdown */}
          {history.length > 0 && (
            <div className="relative" ref={historyRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-[var(--muted-foreground)]"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-3.5 w-3.5" />
                History
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showHistory && (
                <div className="absolute bottom-full left-0 z-50 mb-1 max-h-60 w-80 overflow-y-auto rounded-md border bg-[var(--popover)] p-1 shadow-lg">
                  {history.map((h, i) => (
                    <button
                      key={`${h}-${i}`}
                      type="button"
                      className="flex w-full rounded-sm px-2 py-1.5 text-left text-xs text-[var(--popover-foreground)] hover:bg-[var(--accent)] transition-colors"
                      onClick={() => selectFromHistory(h)}
                    >
                      <span className="line-clamp-2">{h}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-[var(--muted-foreground)] hidden sm:block">
            <kbd className="rounded border bg-[var(--muted)] px-1 py-0.5 text-[10px] font-medium">
              Cmd+Enter
            </kbd>{" "}
            to generate
          </p>
        </div>

        <Button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          size="default"
        >
          {isProcessing ? (
            <>
              <span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Queued…
            </>
          ) : (
            <>
              <Wand2 className="mr-1 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
