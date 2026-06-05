export const mockUsers = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    phone: "+251900000000",
    full_name: "System Administrator",
    role_id: "r001",
    role_name: "Super Admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    phone: "+251911111111",
    full_name: "John Doe",
    role_id: "r002",
    role_name: "Receptionist",
    is_active: true,
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    phone: "+251922222222",
    full_name: "Mekdes Worku",
    role_id: "r004",
    role_name: "Senior Mechanic",
    is_active: true,
    created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    phone: "+251933333333",
    full_name: "Yonas Tadesse",
    role_id: "r003",
    role_name: "Store Manager",
    is_active: true,
    created_at: "2025-02-10T00:00:00Z",
  },
  {
    id: "e5f6a7b8-c9d0-1234-efab-345678901234",
    phone: "+251944444444",
    full_name: "Hanna Gebre",
    role_id: "r005",
    role_name: "Junior Mechanic",
    is_active: true,
    created_at: "2025-03-01T00:00:00Z",
  },
  {
    id: "f6a7b8c9-d0e1-2345-fabc-456789012345",
    phone: "+251955555555",
    full_name: "Dawit Eshetu",
    role_id: "r002",
    role_name: "Receptionist",
    is_active: false,
    created_at: "2025-01-20T00:00:00Z",
  },
];

export const mockRoles = [
  {
    id: "r001",
    name: "Super Admin",
    is_superadmin: true,
    permissions: [],
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "r002",
    name: "Receptionist",
    is_superadmin: false,
    permissions: [
      { module: "job_cards", can_create: true, can_read: true, can_update: true, can_delete: false },
      { module: "performa", can_create: true, can_read: true, can_update: false, can_delete: false },
      { module: "owners", can_create: true, can_read: true, can_update: true, can_delete: false },
      { module: "vehicles", can_read: true, can_update: false, can_delete: false, can_create: false },
      { module: "users", can_read: true, can_update: false, can_delete: false, can_create: false },
    ],
    created_at: "2025-01-10T00:00:00Z",
  },
  {
    id: "r003",
    name: "Store Manager",
    is_superadmin: false,
    permissions: [
      { module: "inventory", can_create: true, can_read: true, can_update: true, can_delete: false },
      { module: "tools", can_read: true, can_update: false, can_delete: false, can_create: false },
      { module: "job_cards", can_read: true, can_update: false, can_delete: false, can_create: false },
    ],
    created_at: "2025-01-10T00:00:00Z",
  },
  {
    id: "r004",
    name: "Senior Mechanic",
    is_superadmin: false,
    permissions: [
      { module: "job_cards", can_create: false, can_read: true, can_update: true, can_delete: false },
      { module: "tools", can_create: false, can_read: true, can_update: true, can_delete: false },
      { module: "inventory", can_read: true, can_update: false, can_delete: false, can_create: false },
    ],
    created_at: "2025-01-20T00:00:00Z",
  },
  {
    id: "r005",
    name: "Junior Mechanic",
    is_superadmin: false,
    permissions: [
      { module: "job_cards", can_read: true, can_update: true, can_delete: false, can_create: false },
      { module: "tools", can_read: true, can_update: false, can_delete: false, can_create: false },
    ],
    created_at: "2025-02-01T00:00:00Z",
  },
];

export const mockEmployees = [
  { id: "e001", name: "Abebe Kebede", job_title: "Senior Mechanic", phone: "+251911100001", is_active: true, created_at: "2025-01-01T00:00:00Z" },
  { id: "e002", name: "Lemma Hailu", job_title: "Mechanic", phone: "+251911100002", is_active: true, created_at: "2025-01-01T00:00:00Z" },
  { id: "e003", name: "Tigist Wold", job_title: "Electrician", phone: "+251911100003", is_active: true, created_at: "2025-01-10T00:00:00Z" },
];

export const mockOwners = [
  { id: "o001", name: "Kebede Abebe", phone: "+251911200001", created_at: "2025-02-01T00:00:00Z" },
  { id: "o002", name: "Sara Tadesse", phone: "+251911200002", created_at: "2025-02-15T00:00:00Z" },
];

export const mockVehicles = [
  { id: "v001", owner_id: "o001", model: "Toyota Hilux 2020", type: "Pickup", engine_number: "ENG-001", chassis_number: "CHS-001", plate_number: "AA-1234", created_at: "2025-02-01T00:00:00Z" },
  { id: "v002", owner_id: "o002", model: "Isuzu D-Max 2022", type: "Pickup", engine_number: "ENG-002", chassis_number: "CHS-002", plate_number: "AA-5678", created_at: "2025-02-15T00:00:00Z" },
  { id: "v003", owner_id: "o001", model: "Nissan Navara 2021", type: "Pickup", engine_number: "ENG-003", chassis_number: "CHS-003", plate_number: "BB-1234", created_at: "2025-03-01T00:00:00Z" },
];

export const mockJobCards = [
  {
    id: "jc001",
    vehicle_id: "v001",
    owner_id: "o001",
    status: "in_repair",
    mileage_km: 45000,
    private_paint: false,
    private_mechanic: false,
    insurance_provider: "Ethio Insurance",
    description: "Engine overhaul and brake replacement",
    remarks: "Customer requested priority service",
    requested_materials: "Brake pads, engine oil 5L",
    created_by: mockUsers[0].id,
    created_at: "2025-03-10T08:00:00Z",
    updated_at: "2025-03-10T14:00:00Z",
    vehicle: mockVehicles[0],
    owner: mockOwners[0],
    mechanics: [mockEmployees[0], mockEmployees[1]],
    conditions: [
      { id: "c001", job_card_id: "jc001", part_name: "trunk", condition_state: "dent" },
      { id: "c002", job_card_id: "jc001", part_name: "lh_body", condition_state: "scratch" },
      { id: "c003", job_card_id: "jc001", part_name: "interior", condition_state: "available" },
    ],
  },
  {
    id: "jc002",
    vehicle_id: "v002",
    owner_id: "o002",
    status: "pending_inspection",
    mileage_km: 32000,
    private_paint: true,
    private_mechanic: false,
    insurance_provider: null,
    description: "Full body paint and dent repair",
    remarks: null,
    requested_materials: null,
    created_by: mockUsers[1].id,
    created_at: "2025-03-15T09:00:00Z",
    updated_at: "2025-03-15T09:00:00Z",
    vehicle: mockVehicles[1],
    owner: mockOwners[1],
    mechanics: [mockEmployees[2]],
    conditions: [
      { id: "c004", job_card_id: "jc002", part_name: "front_body", condition_state: "broken" },
      { id: "c005", job_card_id: "jc002", part_name: "rh_body", condition_state: "damaged" },
    ],
  },
];

export const mockInventoryItems = [
  { id: "i001", part_name: "Brake Pad Set", applicable_vehicle_types: ["Pickup", "SUV"], unit_price: 850.00, supplier_info: "Toyota Parts PLC", min_stock_threshold: 5, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
  { id: "i002", part_name: "Oil Filter", applicable_vehicle_types: ["Pickup", "SUV", "Sedan"], unit_price: 250.00, supplier_info: "Filter Masters", min_stock_threshold: 10, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
  { id: "i003", part_name: "Headlight Assembly", applicable_vehicle_types: ["Pickup"], unit_price: 3200.00, supplier_info: "Auto Parts Co", min_stock_threshold: 3, created_at: "2025-01-05T00:00:00Z", updated_at: "2025-01-05T00:00:00Z" },
];

export const mockLocations = [
  { id: "l001", name: "Main Store", created_at: "2025-01-01T00:00:00Z" },
  { id: "l002", name: "Upper Store", created_at: "2025-01-01T00:00:00Z" },
];

export const mockStockEntries = [
  { id: "s001", item_id: "i001", store_location_id: "l001", quantity: 15 },
  { id: "s002", item_id: "i001", store_location_id: "l002", quantity: 8 },
  { id: "s003", item_id: "i002", store_location_id: "l001", quantity: 25 },
  { id: "s004", item_id: "i003", store_location_id: "l001", quantity: 2 },
];

export const mockTools = [
  { id: "t001", name: "Impact Wrench", specifications: "Makita 1/2 inch 700Nm", total_quantity: 3, created_at: "2025-01-01T00:00:00Z", available_quantity: 2 },
  { id: "t002", name: "Diagnostic Scanner", specifications: "Autel MaxiCOM MK808", total_quantity: 1, created_at: "2025-01-01T00:00:00Z", available_quantity: 1 },
  { id: "t003", name: "6-piece Wrench Set", specifications: "Metric 8-19mm", total_quantity: 5, created_at: "2025-01-02T00:00:00Z", available_quantity: 4 },
];

export const mockToolCheckouts = [
  { id: "co001", tool_id: "t001", employee_id: "e001", job_card_id: "jc001", quantity: 1, checked_out_at: "2025-03-10T10:00:00Z", checked_in_at: null, issued_by: mockUsers[0].id },
  { id: "co002", tool_id: "t003", employee_id: "e002", job_card_id: "jc001", quantity: 1, checked_out_at: "2025-03-10T10:00:00Z", checked_in_at: "2025-03-11T16:00:00Z", issued_by: mockUsers[0].id },
];

export const mockPerformas = [
  {
    id: "p001",
    job_card_id: "jc001",
    version: 1,
    subtotal: 12500.00,
    vat_rate: 15.0,
    vat_amount: 1875.00,
    grand_total: 14375.00,
    status: "sent",
    client_email: "kebede@email.com",
    sent_at: "2025-03-11T10:00:00Z",
    created_at: "2025-03-10T15:00:00Z",
    line_items: [
      { id: "li001", performa_id: "p001", type: "labor", description: "Engine overhaul labor", inventory_item_id: null, quantity: 1, unit_price: 8000.00, total_price: 8000.00 },
      { id: "li002", performa_id: "p001", type: "part", description: "Brake Pad Set", inventory_item_id: "i001", quantity: 2, unit_price: 850.00, total_price: 1700.00 },
      { id: "li003", performa_id: "p001", type: "part", description: "Oil Filter", inventory_item_id: "i002", quantity: 2, unit_price: 250.00, total_price: 500.00 },
      { id: "li004", performa_id: "p001", type: "labor", description: "Brake replacement labor", inventory_item_id: null, quantity: 1, unit_price: 2300.00, total_price: 2300.00 },
    ],
  },
];

export const mockNotifications = [
  { id: "n001", user_id: mockUsers[0].id, role_id: null, title: "Low Stock Alert", message: "Headlight Assembly (i003) is below minimum stock threshold.", entity_type: "inventory", entity_id: "i003", is_read: false, created_at: "2025-03-15T08:00:00Z" },
  { id: "n002", user_id: mockUsers[0].id, role_id: null, title: "Tool Not Returned", message: "Impact Wrench (t001) checked out to Abebe has not been returned yet.", entity_type: "tool", entity_id: "co001", is_read: false, created_at: "2025-03-14T10:00:00Z" },
];

export const mockAuditLogs = [
  { id: "a001", user_id: mockUsers[0].id, action: "job_card.create", entity_type: "job_card", entity_id: "jc001", details: { status: "pending_inspection" }, created_at: "2025-03-10T08:00:00Z" },
  { id: "a002", user_id: mockUsers[0].id, action: "job_card.status_change", entity_type: "job_card", entity_id: "jc001", details: { from: "pending_inspection", to: "in_repair" }, created_at: "2025-03-10T14:00:00Z" },
  { id: "a003", user_id: mockUsers[0].id, action: "performa.create", entity_type: "performa", entity_id: "p001", details: { version: 1 }, created_at: "2025-03-10T15:00:00Z" },
];

export const mockSettings = [
  { key: "vat_rate", value: "15.0", updated_at: "2025-01-01T00:00:00Z" },
];
