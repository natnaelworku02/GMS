"use client";

import { PART_SECTIONS, CONDITION_STATES, CONDITION_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { VehicleConditionInput } from "../types";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface Props {
  conditions: VehicleConditionInput[];
  onChange: (conditions: VehicleConditionInput[]) => void;
  readOnly?: boolean;
}

function StateDot({ state }: { state: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", CONDITION_COLORS[state] || "bg-muted-foreground")}
    />
  );
}

function SectionSummary({ conditions, section }: { conditions: VehicleConditionInput[]; section: typeof PART_SECTIONS[0] }) {
  const counts = CONDITION_STATES.map((cs) => ({
    ...cs,
    count: section.parts.filter(
      (p) => (conditions.find((c) => c.part_name === p.value)?.condition_state || "available") === cs.value,
    ).length,
  })).filter((c) => c.count > 0 && c.value !== "available");

  if (counts.length === 0) {
    return <span className="text-xs text-emerald-500">All available</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5 text-xs">
      {counts.map((c) => (
        <span key={c.value} className="inline-flex items-center gap-1">
          <StateDot state={c.value} />
          {c.count} {c.label}
        </span>
      ))}
    </span>
  );
}

function PartRow({
  part,
  state,
  onStateChange,
  readOnly,
}: {
  part: { value: string; label: string };
  state: string;
  onStateChange: (state: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border py-1.5 first:border-t-0">
      <span className="w-44 shrink-0 truncate text-sm font-medium" title={part.label}>
        <span className="inline-flex items-center gap-1.5">
          <StateDot state={state} />
          {part.label}
        </span>
      </span>
      <div className="flex flex-1 items-center justify-end gap-0.5">
        {CONDITION_STATES.map((cs) => {
          const selected = state === cs.value;
          return (
            <div key={cs.value} className="flex flex-col items-center gap-0.5" style={{ width: 22 }}>
              {readOnly ? (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[8px]",
                    selected
                    ? cs.value === "available"
                      ? "bg-emerald-500 text-white"
                      : "bg-indigo-500 text-white"
                      : "text-transparent",
                  )}
                >
                  {selected ? "✓" : ""}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onStateChange(cs.value)}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-all",
                    selected
                      ? cs.value === "available"
                        ? "border-emerald-500 bg-emerald-500 ring-1 ring-emerald-500/20"
                        : "border-indigo-500 bg-indigo-500 ring-1 ring-indigo-500/20"
                      : "border-muted-foreground/20 hover:border-muted-foreground/40",
                  )}
                />
              )}
              <span className="text-[8px] leading-none text-muted-foreground">{cs.label === "Not Available" ? "N/A" : cs.label.slice(0, 4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConditionChecklist({ conditions, onChange, readOnly }: Props) {
  const getState = (partName: string) =>
    conditions.find((c) => c.part_name === partName)?.condition_state || "available";

  const setState = (partName: string, conditionState: string) => {
    const next = conditions.filter((c) => c.part_name !== partName);
    if (conditionState !== "available") {
      next.push({ part_name: partName, condition_state: conditionState });
    }
    onChange(next);
  };

  const currentStateLabel = (partName: string) =>
    CONDITION_STATES.find((cs) => cs.value === getState(partName))?.label || "Available";

  return (
    <>
      {/* Desktop: section cards */}
      <div className="hidden space-y-4 md:block">
        {PART_SECTIONS.map((section) => {
          const damagedCount = section.parts.filter(
            (p) => getState(p.value) !== "available",
          ).length;
          return (
            <div key={section.sectionKey} className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h3 className="text-sm font-semibold">{section.sectionLabel}</h3>
                <SectionSummary conditions={conditions} section={section} />
              </div>
              <div className="px-4 py-1">
                {section.parts.map((part) => (
                  <PartRow
                    key={part.value}
                    part={part}
                    state={getState(part.value)}
                    onStateChange={(s) => setState(part.value, s)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
              {!readOnly && damagedCount > 0 && (
                <div className="border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
                  {damagedCount} of {section.parts.length} items marked as damaged
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: accordion per section */}
      <div className="md:hidden">
        <Accordion>
          {PART_SECTIONS.map((section) => {
            const damagedCount = section.parts.filter(
              (p) => getState(p.value) !== "available",
            ).length;
            return (
              <AccordionItem key={section.sectionKey}>
                <AccordionTrigger className="px-3">
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="text-sm font-medium">{section.sectionLabel}</span>
                    <span className={cn("text-xs", damagedCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {damagedCount > 0 ? `${damagedCount} damaged` : "All OK"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-0.5 px-3 pb-2">
                    {section.parts.map((part) => {
                      const state = getState(part.value);
                      return (
                        <div key={part.value} className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
                          <span className="flex-1 truncate text-sm font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <StateDot state={state} />
                              {part.label}
                            </span>
                          </span>
                          {readOnly ? (
                            <span className="shrink-0 text-xs text-muted-foreground">{currentStateLabel(part.value)}</span>
                          ) : (
                            <div className="flex shrink-0 gap-1">
                              {CONDITION_STATES.map((cs) => {
                                const selected = state === cs.value;
                                return (
                                  <button
                                    key={cs.value}
                                    type="button"
                                    onClick={() => setState(part.value, cs.value)}
                                    className={cn(
                                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                                      selected
                                        ? cs.value === "available"
                                          ? "border-emerald-500 bg-emerald-500"
                                          : "border-indigo-500 bg-indigo-500"
                                        : "border-muted-foreground/20 hover:border-muted-foreground/40",
                                    )}
                                    title={cs.label}
                                  >
                                    {selected && <span className="text-[8px] text-white">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </>
  );
}
