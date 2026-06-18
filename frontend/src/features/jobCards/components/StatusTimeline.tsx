"use client";

import { Check } from "lucide-react";

const STEPS = [
  "pending_inspection",
  "waiting_for_approval",
  "in_repair",
  "waiting_for_parts",
  "ready_for_testing",
  "completed",
];

const LABELS: Record<string, string> = {
  pending_inspection: "Pending\nInspection",
  waiting_for_approval: "Waiting\nfor Approval",
  in_repair: "In\nRepair",
  waiting_for_parts: "Waiting\nfor Parts",
  ready_for_testing: "Ready for\nTesting",
  completed: "Completed",
};

interface Props {
  currentStatus: string;
}

export function StatusTimeline({ currentStatus }: Props) {
  const currentIdx = STEPS.indexOf(currentStatus);

  return (
    <div className="relative mb-8 mt-2">
      <div className="absolute left-0 right-0 top-[17px] h-0.5 bg-muted">
        <div
          className="h-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative flex justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isPending = i > currentIdx;

          return (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  isCompleted
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : isCurrent
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 ring-4 ring-indigo-500/20"
                      : "border-muted-foreground/30 bg-card text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={`whitespace-pre text-center text-[10px] leading-tight ${
                  isCurrent
                    ? "font-semibold text-indigo-500"
                    : isCompleted
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/40"
                }`}
              >
                {LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
