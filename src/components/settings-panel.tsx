"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  AspectRatio,
  ProviderId,
  Quality,
  Resolution,
} from "@/lib/types";
import { ASPECT_RATIO_LABELS, QUALITY_LABELS, RESOLUTION_LABELS } from "@/lib/types";
import { PROVIDERS, getClosestAspectRatio, getModelDef } from "@/lib/providers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";
import { ProviderLogo } from "@/components/provider-logo";
import { Button } from "@/components/ui/button";

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  referenceImage?: string;
}

export function SettingsPanel({
  settings,
  onChange,
  referenceImage,
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [suggestedAspectRatio, setSuggestedAspectRatio] = useState<AspectRatio | null>(null);
  const lastAutoAppliedRef = useRef<{
    provider: ProviderId;
    model: string;
    referenceImage: string;
    suggestedAspectRatio: AspectRatio;
  } | null>(null);

  const providerDef = PROVIDERS[settings.provider];
  const modelDef = getModelDef(settings.provider, settings.model);

  const update = useCallback(
    (partial: Partial<AppSettings>) => {
      onChange({ ...settings, ...partial });
    },
    [settings, onChange],
  );

  const handleProviderChange = useCallback(
    (provider: ProviderId) => {
      const pDef = PROVIDERS[provider];
      const firstModel = pDef.models[0];
      update({
        provider,
        model: firstModel?.id ?? "",
        customModelId: "",
        aspectRatio:
          firstModel?.supportedAspectRatios[0] ?? settings.aspectRatio,
        quality: firstModel?.defaultQuality ?? "auto",
        resolution: firstModel?.defaultResolution,
      });
    },
    [update, settings.aspectRatio],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      const mDef = getModelDef(settings.provider, model);
      update({
        model,
        customModelId: "",
        aspectRatio: mDef?.supportedAspectRatios[0] ?? settings.aspectRatio,
        quality: mDef?.defaultQuality ?? settings.quality,
        resolution: mDef?.defaultResolution,
      });
    },
    [settings.provider, settings.aspectRatio, settings.quality, update],
  );

  const supportedAspectRatios = useMemo(
    () => modelDef?.supportedAspectRatios ?? (Object.keys(ASPECT_RATIO_LABELS) as AspectRatio[]),
    [modelDef],
  );

  const supportedQualities = useMemo(
    () => modelDef?.supportedQualities ?? undefined,
    [modelDef],
  );

  const supportedResolutions = useMemo(
    () => modelDef?.supportedResolutions ?? undefined,
    [modelDef],
  );

  useEffect(() => {
    if (!referenceImage) {
      setSuggestedAspectRatio(null);
      return;
    }

    let isCancelled = false;
    const image = new Image();

    image.onload = () => {
      if (isCancelled) return;

      setSuggestedAspectRatio(
        getClosestAspectRatio(
          image.naturalWidth,
          image.naturalHeight,
          supportedAspectRatios,
        ),
      );
    };

    image.onerror = () => {
      if (!isCancelled) {
        setSuggestedAspectRatio(null);
      }
    };

    image.src = referenceImage;

    return () => {
      isCancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [referenceImage, supportedAspectRatios]);

  useEffect(() => {
    if (!referenceImage || !suggestedAspectRatio) {
      lastAutoAppliedRef.current = null;
      return;
    }

    const lastAutoApplied = lastAutoAppliedRef.current;
    if (
      lastAutoApplied &&
      lastAutoApplied.provider === settings.provider &&
      lastAutoApplied.model === settings.model &&
      lastAutoApplied.referenceImage === referenceImage &&
      lastAutoApplied.suggestedAspectRatio === suggestedAspectRatio
    ) {
      return;
    }

    lastAutoAppliedRef.current = {
      provider: settings.provider,
      model: settings.model,
      referenceImage,
      suggestedAspectRatio,
    };

    if (settings.aspectRatio !== suggestedAspectRatio) {
      update({ aspectRatio: suggestedAspectRatio });
    }
  }, [
    referenceImage,
    settings.provider,
    settings.model,
    settings.aspectRatio,
    suggestedAspectRatio,
    update,
  ]);

  const currentApiKey = settings.apiKeys[settings.provider] ?? "";

  return (
    <div className="space-y-4">
      {/* ── Provider ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <Select
          value={settings.provider}
          onValueChange={(v) => handleProviderChange(v as ProviderId)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Providers</SelectLabel>
              {Object.values(PROVIDERS).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <ProviderLogo
                    domain={p.logoDomain}
                    fallbackIcon={p.icon}
                    name={p.name}
                    size={16}
                    className="mr-2"
                  />
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* ── Model ────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Select value={settings.model} onValueChange={handleModelChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Models</SelectLabel>
              {providerDef.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {modelDef?.description && (
          <p className="text-xs text-[var(--muted-foreground)]">
            {modelDef.description}
          </p>
        )}
      </div>

      {/* ── Custom model override ────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>
          Custom model ID{" "}
          <span className="text-[var(--muted-foreground)]">(optional override)</span>
        </Label>
        <Input
          placeholder="e.g. my-custom-model-v2"
          value={settings.customModelId}
          onChange={(e) => update({ customModelId: e.target.value })}
        />
      </div>

      {/* ── Aspect ratio ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Aspect Ratio</Label>
        <Select
          value={settings.aspectRatio}
          onValueChange={(v) => update({ aspectRatio: v as AspectRatio })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedAspectRatios.map((ar) => (
              <SelectItem key={ar} value={ar}>
                {ASPECT_RATIO_LABELS[ar]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {suggestedAspectRatio && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Suggested based on input image: {ASPECT_RATIO_LABELS[suggestedAspectRatio]}
          </p>
        )}
      </div>

      {/* ── Quality (if supported) ───────────────────────────── */}
      {supportedQualities && supportedQualities.length > 0 && (
        <div className="space-y-1.5">
          <Label>Quality</Label>
          <Select
            value={settings.quality}
            onValueChange={(v) => update({ quality: v as Quality })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedQualities.map((q) => (
                <SelectItem key={q} value={q}>
                  {QUALITY_LABELS[q]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Resolution (if supported) ──────────────────────────── */}
      {supportedResolutions && supportedResolutions.length > 0 && (
        <div className="space-y-1.5">
          <Label>Resolution</Label>
          <Select
            value={settings.resolution ?? modelDef?.defaultResolution ?? supportedResolutions[0]}
            onValueChange={(v) => update({ resolution: v as Resolution })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedResolutions.map((r) => (
                <SelectItem key={r} value={r}>
                  {RESOLUTION_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Generation settings ──────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Images per prompt</Label>
            <span className="text-sm font-mono text-[var(--muted-foreground)]">
              {settings.imagesPerPrompt}
            </span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[settings.imagesPerPrompt]}
            onValueChange={([v]) => update({ imagesPerPrompt: v })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Retries on failure</Label>
            <span className="text-sm font-mono text-[var(--muted-foreground)]">
              {settings.retries}
            </span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[settings.retries]}
            onValueChange={([v]) => update({ retries: v })}
          />
        </div>
      </div>

      {/* ── Advanced / connection settings ────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Settings2 className="h-3.5 w-3.5" />
          Connection Settings
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            {/* API Key */}
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={`Enter ${providerDef.name} API key`}
                  value={currentApiKey}
                  onChange={(e) =>
                    update({
                      apiKeys: {
                        ...settings.apiKeys,
                        [settings.provider]: e.target.value,
                      },
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Stored in browser only. Never sent to our servers.
              </p>
            </div>

            {/* Base URL (optional override) */}
            <div className="space-y-1.5">
              <Label>
                Base URL
                {settings.provider !== "custom" && (
                  <span className="text-[var(--muted-foreground)]"> (optional override)</span>
                )}
              </Label>
              <Input
                placeholder={
                  settings.provider === "custom"
                    ? "https://your-api.com"
                    : providerDef.defaultBaseUrl
                }
                value={settings.customBaseUrl}
                onChange={(e) => update({ customBaseUrl: e.target.value })}
              />
              {settings.provider !== "custom" && (
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Overrides the default endpoint ({providerDef.defaultBaseUrl}).
                </p>
              )}
            </div>

            {/* Proxy */}
            <div className="space-y-1.5">
              <Label>
                Proxy <span className="text-[var(--muted-foreground)]">(optional)</span>
              </Label>
              <Input
                placeholder="socks5h://user:pass@host:port or http://host:port"
                value={settings.proxy}
                onChange={(e) => update({ proxy: e.target.value })}
              />
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Supports HTTP, HTTPS, SOCKS5, and SOCKS5H proxies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
