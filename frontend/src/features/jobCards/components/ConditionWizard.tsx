"use client";

import { useState, useCallback } from "react";
import { PART_SECTIONS, CONDITION_STATES, CONDITION_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, CheckCircle2 } from "lucide-react";
import type { VehicleConditionInput } from "../types";

interface Props {
  conditions: VehicleConditionInput[];
  onChange: (conditions: VehicleConditionInput[]) => void;
  readOnly?: boolean;
  showStepIndicator?: boolean;
  step?: number;
  onStepChange?: (step: number) => void;
  onShowSummary?: (show: boolean) => void;
  showSummary?: boolean;
}

export function ConditionWizard({ conditions, onChange, readOnly, showStepIndicator = true, step: externalStep, onStepChange, onShowSummary, showSummary: externalShowSummary }: Props) {
  const [internalStep, setInternalStep] = useState(0);
  const [internalShowSummary, setInternalShowSummary] = useState(false);
  const step = externalStep ?? internalStep;
  const showSummary = externalShowSummary ?? internalShowSummary;
  const setStep = onStepChange ?? setInternalStep;
  const setShowSummary = onShowSummary ?? setInternalShowSummary;

  const getState = useCallback(
    (partName: string) =>
      conditions.find((c) => c.part_name === partName)?.condition_state || "available",
    [conditions],
  );

  const setState = useCallback(
    (partName: string, conditionState: string) => {
      const next = conditions.filter((c) => c.part_name !== partName);
      if (conditionState !== "available") {
        next.push({ part_name: partName, condition_state: conditionState });
      }
      onChange(next);
    },
    [conditions, onChange],
  );

  const markAllAvailable = useCallback(
    (sectionKey: string) => {
      const section = PART_SECTIONS.find((s) => s.sectionKey === sectionKey);
      if (!section) return;
      const next = conditions.filter(
        (c) => !section.parts.some((p) => p.value === c.part_name),
      );
      onChange(next);
    },
    [conditions, onChange],
  );

  const totalSections = PART_SECTIONS.length;

  const currentSection = PART_SECTIONS[step];

  const damagedCount = currentSection
    ? currentSection.parts.filter((p) => getState(p.value) !== "available").length
    : 0;

  const allDamagedItems = conditions.filter((c) => c.condition_state !== "available");
  const totalDamaged = allDamagedItems.length;

  if (readOnly) {
    return (
      <div className="space-y-4">
        {PART_SECTIONS.map((section) => {
          return (
            <div key={section.sectionKey} className="rounded-xl border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-2.5">
                <h3 className="text-sm font-semibold">{section.sectionLabel}</h3>
              </div>
              <div className="divide-y divide-border px-4">
                {section.parts.map((part) => {
                  const state = getState(part.value);
                  return (
                    <div key={part.value} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">{part.label}</span>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        state === "available"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600",
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", CONDITION_COLORS[state])} />
                        {CONDITION_STATES.find((cs) => cs.value === state)?.label || state}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Summary</h3>
          {totalDamaged > 0 ? (
            <span className="text-xs text-rose-500">{totalDamaged} item(s) marked as damaged</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <CheckCircle2 size={14} />
              All items available
            </span>
          )}
        </div>

        {totalDamaged === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No issues reported — all vehicle parts are available.
          </div>
        ) : (
          <div className="space-y-2">
            {PART_SECTIONS.map((section) => {
              const sectionDamaged = section.parts.filter(
                (p) => getState(p.value) !== "available",
              );
              if (sectionDamaged.length === 0) return null;
              return (
                <div key={section.sectionKey} className="rounded-xl border bg-card shadow-sm">
                  <div className="border-b border-border px-4 py-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">{section.sectionLabel}</h4>
                  </div>
                  <div className="divide-y divide-border px-4">
                    {sectionDamaged.map((part) => {
                      const state = getState(part.value);
                      return (
                        <div key={part.value} className="flex items-center justify-between py-2 text-sm">
                          <span>{part.label}</span>
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-600")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", CONDITION_COLORS[state])} />
                            {CONDITION_STATES.find((cs) => cs.value === state)?.label || state}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setShowSummary(false)}>
            <ChevronLeft size={15} />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showStepIndicator && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PART_SECTIONS.map((section, i) => (
            <button
              key={section.sectionKey}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex min-w-32 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
                i === step
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : i < step
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/70 bg-muted/40 text-muted-foreground",
              )}
              title={section.sectionLabel}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  i === step
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-background text-muted-foreground",
                )}
              >
                {i < step ? <Check size={11} /> : i + 1}
              </span>
              <span className="line-clamp-1">{section.sectionLabel}</span>
            </button>
          ))}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <div>
          <h3 className="text-base font-semibold">
            {showStepIndicator ? `Section ${step + 1} of ${totalSections} — ` : ""}{currentSection.sectionLabel}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentSection.parts.length} parts
            {damagedCount > 0 && (
              <span className="ml-1 text-rose-500">· {damagedCount} damaged</span>
            )}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => markAllAvailable(currentSection.sectionKey)}>
          Mark all OK
        </Button>
      </div>

      {/* Parts list */}
      <div className="grid gap-3 lg:grid-cols-2">
        {currentSection.parts.map((part) => {
          const state = getState(part.value);
          return (
            <div
              key={part.value}
              className="rounded-xl border border-border/70 bg-card p-3 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-semibold leading-snug">{part.label}</span>
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CONDITION_COLORS[state])} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONDITION_STATES.map((cs) => {
                  const selected = state === cs.value;
                  return (
                    <button
                      key={cs.value}
                      type="button"
                      onClick={() => setState(part.value, cs.value)}
                      className={cn(
                        "flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-all",
                        selected
                          ? cs.value === "available"
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                            : "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "border-border bg-muted/35 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {selected && <Check size={12} />}
                      <span className="truncate">{cs.label === "Not Available" ? "N/A" : cs.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation (internal mode only) */}
      {!onStepChange && (
        <div className="flex items-center justify-between pt-2">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={14} />
                Previous
              </Button>
            )}
          </div>
          <div>
            {step < totalSections - 1 ? (
              <Button type="button" size="sm" onClick={() => setStep(step + 1)}>
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => setShowSummary(true)}>
                Review Summary
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
