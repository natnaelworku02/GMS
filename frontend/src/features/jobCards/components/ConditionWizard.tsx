"use client";

import { useState, useCallback } from "react";
import { PART_SECTIONS, CONDITION_STATES, CONDITION_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Check, CheckCircle2 } from "lucide-react";
import type { VehicleConditionInput } from "../types";

interface Props {
  conditions: VehicleConditionInput[];
  onChange: (conditions: VehicleConditionInput[]) => void;
  readOnly?: boolean;
}

function StatePicker({
  open,
  onOpenChange,
  currentState,
  onSelect,
  partLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentState: string;
  onSelect: (state: string) => void;
  partLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{partLabel}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2">
          {CONDITION_STATES.map((cs) => {
            const selected = currentState === cs.value;
            return (
              <button
                key={cs.value}
                type="button"
                onClick={() => {
                  onSelect(cs.value);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  selected
                    ? "border-indigo-500 bg-indigo-500/10 font-medium"
                    : "border-input hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-muted-foreground/30",
                  )}
                >
                  {selected && <Check size={12} />}
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", CONDITION_COLORS[cs.value])} />
                  {cs.label}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConditionWizard({ conditions, onChange, readOnly }: Props) {
  const [step, setStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPart, setPickerPart] = useState<{ value: string; label: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  const openPicker = (part: { value: string; label: string }) => {
    setPickerPart(part);
    setPickerOpen(true);
  };

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
          const sectionDamaged = section.parts.filter((p) => getState(p.value) !== "available");
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
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {PART_SECTIONS.map((section, i) => (
          <div key={section.sectionKey} className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-all",
                i === step
                  ? "bg-indigo-500 text-white"
                  : i < step
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground",
              )}
              title={section.sectionLabel}
            >
              {i < step ? <Check size={10} /> : i + 1}
            </button>
            {i < totalSections - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-all",
                  i < step ? "bg-emerald-400" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Section {step + 1} of {totalSections} — {currentSection.sectionLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
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
      <div className="space-y-1">
        {currentSection.parts.map((part) => {
          const state = getState(part.value);
          const stateLabel = CONDITION_STATES.find((cs) => cs.value === state)?.label || "Available";
          return (
            <button
              key={part.value}
              type="button"
              onClick={() => openPicker(part)}
              className="flex w-full items-center justify-between rounded-lg border border-input px-3 py-2.5 text-left text-sm transition-all hover:bg-muted"
            >
              <span className="font-medium">{part.label}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  state === "available"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", CONDITION_COLORS[state])} />
                {stateLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
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

      {/* State picker dialog */}
      {pickerPart && (
        <StatePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          currentState={getState(pickerPart.value)}
          onSelect={(s) => setState(pickerPart.value, s)}
          partLabel={pickerPart.label}
        />
      )}
    </div>
  );
}
