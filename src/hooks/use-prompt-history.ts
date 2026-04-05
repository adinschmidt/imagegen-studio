"use client";

import { useState, useEffect, useCallback } from "react";
import { loadPromptHistory, addToPromptHistory } from "@/lib/storage";

export function usePromptHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(loadPromptHistory());
  }, []);

  const addPrompt = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const updated = addToPromptHistory(trimmed);
    setHistory(updated);
  }, []);

  return { history, addPrompt };
}
