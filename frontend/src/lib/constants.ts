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

export const PART_SECTIONS = [
  {
    sectionKey: "trunk",
    sectionLabel: "Trunk",
    parts: [
      { value: "trunk_clutch_oil_cup", label: "Clutch Oil Cup" },
      { value: "trunk_brake_oil_cup", label: "Brake Oil Cup" },
      { value: "trunk_water_tank_cup", label: "Water Tank Cup" },
      { value: "trunk_engine_cup", label: "Engine Cup" },
      { value: "trunk_air_duct_hose", label: "Air Duct Hose" },
      { value: "trunk_alternator", label: "Alternator" },
      { value: "trunk_steering_oil_cup", label: "Steering Oil Cup" },
      { value: "trunk_radiator_cup", label: "Radiator Cup" },
      { value: "trunk_horn", label: "Horn" },
      { value: "trunk_battery_with_cover", label: "Battery with Cover" },
      { value: "trunk_battery_fixture", label: "Battery Fixture" },
      { value: "trunk_oil_dip_stick", label: "Oil Dip Stick" },
      { value: "trunk_starter_motor", label: "Starter Motor" },
      { value: "trunk_fuse_box_cover", label: "Fuse Box Cover" },
    ],
  },
  {
    sectionKey: "front_body",
    sectionLabel: "Front Body",
    parts: [
      { value: "front_logo_and_plate", label: "Logo Front & F.Plate No" },
      { value: "front_hood_with_guard", label: "Hood With Guard" },
      { value: "front_windshield", label: "Windshield FR" },
      { value: "front_wipers", label: "Wipers Arm & Blade Cover" },
      { value: "front_antenna", label: "Antenna" },
      { value: "front_fender_lh", label: "Fender FR LH" },
      { value: "front_over_fender_lh", label: "Over Fender FR LH" },
      { value: "front_liner_lh", label: "FR LH Liner & M.guard" },
      { value: "front_free_hub_lock_lh", label: "Free Hub Lock LH" },
      { value: "front_side_lamp_lh", label: "Side Lamp LH" },
      { value: "front_head_lamp_lh", label: "Head Lamp LH" },
      { value: "front_fog_lamp", label: "Fog Lamp LH & RH" },
      { value: "front_bumper", label: "Bumper" },
      { value: "front_bumper_facial", label: "Bumper Facial RH & LH" },
      { value: "front_radiator_grill", label: "Radiator Grill" },
      { value: "front_head_lamp_rh", label: "Head Lamp RH" },
      { value: "front_side_lamp_rh", label: "Side Lamp RH" },
      { value: "front_fender_rh", label: "Fender FR RH" },
      { value: "front_over_fender_rh", label: "Over Fender FR RH" },
      { value: "front_free_hub_lock_rh", label: "Free Hub Lock RH" },
      { value: "front_liner_rh", label: "FR RH Liner & M.guard" },
    ],
  },
  {
    sectionKey: "rh_body",
    sectionLabel: "RH Body",
    parts: [
      { value: "rh_side_mirror", label: "Side View Mirror RH" },
      { value: "rh_pedal", label: "Pedal RH" },
      { value: "rh_door_handle_fr", label: "Door & Handle FR RH" },
      { value: "rh_door_glass_fr", label: "Door & Glass FR RH" },
      { value: "rh_door_handle_rr", label: "Door & Handle RR RH" },
      { value: "rh_door_glass_rr", label: "Door & Glass RR RH" },
      { value: "rh_fuel_filter_door", label: "Fuel Filter Door" },
      { value: "rh_fuel_tank_cap", label: "Fuel Tank Cap" },
      { value: "rh_liner_rr", label: "RR RH Liner & M.guard" },
      { value: "rh_over_fender_rr", label: "Over Fender RR RH" },
      { value: "rh_fender_rr", label: "Fender RR RH" },
    ],
  },
  {
    sectionKey: "rear_body",
    sectionLabel: "Rear Body",
    parts: [
      { value: "rear_tail_lamp_rh", label: "Tail Lamp RH" },
      { value: "rear_tail_lamp_lh", label: "Tail Lamp LH" },
      { value: "rear_windshield", label: "Windshield RR" },
      { value: "rear_back_door", label: "Back Door" },
      { value: "rear_logo_and_plate", label: "Logo Rear & R.Plate N" },
      { value: "rear_back_floor_cover", label: "Back Floor Cover" },
      { value: "rear_license_lamp", label: "License Lamp" },
      { value: "rear_spare_tire_carrier", label: "Spare Tire Carrier" },
      { value: "rear_spare_tire", label: "Spare Tire" },
      { value: "rear_bumper_reflector", label: "Bumper RR & Reflector" },
    ],
  },
  {
    sectionKey: "lh_body",
    sectionLabel: "LH Body",
    parts: [
      { value: "lh_door_handle_rr", label: "Door & Handle RR LH" },
      { value: "lh_door_glass_rr", label: "Door & Glass RR LH" },
      { value: "lh_liner_rr", label: "RR LH Liner & M.guard" },
      { value: "lh_over_fender_rr", label: "Over Fender RR LH" },
      { value: "lh_fender_rr", label: "Fender RR LH" },
      { value: "lh_door_handle_fr", label: "Door & Handle FR LH" },
      { value: "lh_door_glass_fr", label: "Door & Glass FR LH" },
      { value: "lh_side_mirror", label: "Side View Mirror LH" },
      { value: "lh_pedal", label: "Pedal LH" },
    ],
  },
  {
    sectionKey: "interior",
    sectionLabel: "Interior",
    parts: [
      { value: "int_sun_visor_lh", label: "Sun Visor LH" },
      { value: "int_sun_visor_rh", label: "Sun Visor RH" },
      { value: "int_roof", label: "Roof" },
      { value: "int_air_bag", label: "Air Bag" },
      { value: "int_fuel_level", label: "Fuel Level" },
      { value: "int_ac_knob", label: "AC Knob" },
      { value: "int_cigarette_lighter", label: "Cigarette Lighter" },
      { value: "int_cigarette_lighter_cover", label: "Cigarette Lighter Cover" },
      { value: "int_room_light", label: "Room Light" },
      { value: "int_head_rest", label: "Head Rest" },
      { value: "int_speaker", label: "Speaker (Radio)" },
      { value: "int_glove_box", label: "Glove Box" },
      { value: "int_door_locks", label: "Door Locks" },
      { value: "int_door_glass_lifter", label: "Door Glass Lifter" },
      { value: "int_floor_mates", label: "Floor Mates" },
      { value: "int_gear_shifting_knob", label: "Gear Shifting Lever Knob" },
      { value: "int_auto_shift_switch", label: "Automatic Shifting Switch" },
      { value: "int_jack_and_handle", label: "Jack and Handle" },
      { value: "int_tire_wrench", label: "Tire Wrench" },
      { value: "int_fire_extinguisher", label: "Fire Extinguisher" },
      { value: "int_first_aid", label: "First Aid" },
      { value: "int_reflector", label: "Reflector" },
    ],
  },
  {
    sectionKey: "peripheral",
    sectionLabel: "Peripheral",
    parts: [
      { value: "peri_remote_controller", label: "Remote Controller" },
      { value: "peri_wheel_nut", label: "Wheel Nut" },
      { value: "peri_wheel_cup", label: "Wheel Cup" },
      { value: "peri_lh_w_guard", label: "LH W. Guard FR & RR" },
      { value: "peri_rh_w_guard", label: "RH W. Guard FR & RR" },
    ],
  },
];

export const PART_NAMES = PART_SECTIONS.flatMap((s) =>
  s.parts.map((p) => ({ ...p, sectionKey: s.sectionKey })),
);

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

export const CONDITION_COLORS: Record<string, string> = {
  available: "bg-emerald-500",
  damaged: "bg-pink-500",
  not_available: "bg-stone-400",
  scratch: "bg-yellow-400",
  broken: "bg-rose-600",
  crack: "bg-orange-300",
  dent: "bg-violet-400",
  bend: "bg-cyan-500",
};

export const STAFF_ROLES = [
  { value: "disassembler", label: "Disassembler", labelAm: "በታኝ" },
  { value: "panel_beater", label: "Panel Beater", labelAm: "ባትላሜራ" },
  { value: "mechanic", label: "Mechanic", labelAm: "መካኒክ" },
  { value: "painter", label: "Painter", labelAm: "ቀለም ሰሪ" },
] as const;
