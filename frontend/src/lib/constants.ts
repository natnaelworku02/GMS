export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_inspection: ["waiting_for_approval"],
  waiting_for_approval: ["in_repair"],
  in_repair: ["waiting_for_parts", "ready_for_testing"],
  waiting_for_parts: ["in_repair"],
  ready_for_testing: ["completed"],
  completed: [],
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending_inspection: "Pending Inspection",
  waiting_for_approval: "Waiting for Approval",
  in_repair: "In Repair",
  waiting_for_parts: "Waiting for Parts",
  ready_for_testing: "Ready for Testing",
  completed: "Completed",
};

export const PERFORMA_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
};

export const PART_NAMES = [
  { value: "trunk", label: "Trunk" },
  { value: "lh_body", label: "Left Hand Body" },
  { value: "rh_body", label: "Right Hand Body" },
  { value: "interior", label: "Interior" },
  { value: "front_body", label: "Front Body" },
  { value: "peripheral", label: "Peripheral" },
];

export const MODULES = [
  { key: "job_cards", labelKey: "nav.jobCards" },
  { key: "performa", labelKey: "nav.performas" },
  { key: "inventory", labelKey: "nav.inventory" },
  { key: "tools", labelKey: "nav.tools" },
  { key: "employees", labelKey: "nav.employees" },
  { key: "users", labelKey: "nav.users" },
  { key: "settings", labelKey: "nav.settings" },
] as const;

export const ACTIONS = ["create", "read", "update", "delete"] as const;

export const CONDITION_STATES = [
  { value: "available", label: "Available" },
  { value: "damaged", label: "Damaged" },
  { value: "not_available", label: "Not Available" },
  { value: "scratch", label: "Scratch" },
  { value: "broken", label: "Broken" },
  { value: "crack", label: "Crack" },
  { value: "dent", label: "Dent" },
  { value: "bend", label: "Bend" },
];
