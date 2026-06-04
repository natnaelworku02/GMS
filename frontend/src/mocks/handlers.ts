import { delay, http, HttpResponse } from "msw";
import {
  mockAuditLogs,
  mockEmployees,
  mockInventoryItems,
  mockJobCards,
  mockLocations,
  mockNotifications,
  mockOwners,
  mockPerformas,
  mockRoles,
  mockSettings,
  mockStockEntries,
  mockToolCheckouts,
  mockTools,
  mockUsers,
  mockVehicles,
} from "./data";

const base = "http://localhost:8000/api/v1";

// --- Auth ---

const tokens = {
  access_token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock",
  refresh_token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-refresh",
};

export const handlers = [
  // POST /auth/login
  http.post(`${base}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { phone: string; password: string };
    const user = mockUsers.find((u) => u.phone === body.phone);
    if (user) {
      return HttpResponse.json({
        ...tokens,
        user,
      });
    }
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),

  // POST /auth/refresh
  http.post(`${base}/auth/refresh`, async () => {
    return HttpResponse.json(tokens);
  }),

  // GET /auth/me
  http.get(`${base}/auth/me`, async () => {
    return HttpResponse.json(mockUsers[0]);
  }),

  // --- Users ---

  http.get(`${base}/auth/users`, async () => {
    return HttpResponse.json(mockUsers);
  }),

  http.get(`${base}/auth/users/:id`, async ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id);
    if (user) return HttpResponse.json(user);
    return HttpResponse.json({ detail: "User not found" }, { status: 404 });
  }),

  http.post(`${base}/auth/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newUser = {
      id: crypto.randomUUID(),
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.patch(`${base}/auth/users/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockUsers[0], ...(body as object) });
  }),

  // --- Roles ---

  http.get(`${base}/roles`, async () => {
    return HttpResponse.json(mockRoles);
  }),

  http.get(`${base}/roles/:id`, async ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id);
    if (role) return HttpResponse.json(role);
    return HttpResponse.json({ detail: "Role not found" }, { status: 404 });
  }),

  http.post(`${base}/roles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newRole = {
      id: crypto.randomUUID(),
      ...body,
      permissions: [],
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newRole, { status: 201 });
  }),

  http.put(`${base}/roles/:id/permissions`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockRoles[0], permissions: body });
  }),

  // --- Settings ---

  http.get(`${base}/settings`, async () => {
    return HttpResponse.json(mockSettings);
  }),

  http.put(`${base}/settings/:key`, async ({ request, params }) => {
    const body = (await request.json()) as { value: string };
    return HttpResponse.json({
      key: params.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    });
  }),

  // --- Owners ---

  http.get(`${base}/owners`, async () => {
    return HttpResponse.json(mockOwners);
  }),

  http.get(`${base}/owners/:id`, async ({ params }) => {
    const owner = mockOwners.find((o) => o.id === params.id);
    if (owner) return HttpResponse.json(owner);
    return HttpResponse.json({ detail: "Owner not found" }, { status: 404 });
  }),

  http.post(`${base}/owners`, async ({ request }) => {
    const body = (await request.json()) as { name: string; phone: string };
    const newOwner = {
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newOwner, { status: 201 });
  }),

  http.patch(`${base}/owners/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockOwners[0], ...(body as object) });
  }),

  // --- Vehicles ---

  http.get(`${base}/vehicles`, async ({ request }) => {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get("owner_id");
    if (ownerId) {
      return HttpResponse.json(mockVehicles.filter((v) => v.owner_id === ownerId));
    }
    return HttpResponse.json(mockVehicles);
  }),

  http.get(`${base}/vehicles/:id`, async ({ params }) => {
    const vehicle = mockVehicles.find((v) => v.id === params.id);
    if (vehicle) return HttpResponse.json(vehicle);
    return HttpResponse.json({ detail: "Vehicle not found" }, { status: 404 });
  }),

  http.post(`${base}/vehicles`, async ({ request }) => {
    const body = await request.json();
    const newVehicle = {
      id: crypto.randomUUID(),
      ...(body as object),
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newVehicle, { status: 201 });
  }),

  // --- Job Cards ---

  http.get(`${base}/job-cards`, async ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status) {
      return HttpResponse.json(mockJobCards.filter((j) => j.status === status));
    }
    return HttpResponse.json(mockJobCards);
  }),

  http.get(`${base}/job-cards/:id`, async ({ params }) => {
    const jc = mockJobCards.find((j) => j.id === params.id);
    if (jc) return HttpResponse.json(jc);
    return HttpResponse.json({ detail: "Job card not found" }, { status: 404 });
  }),

  http.post(`${base}/job-cards`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    const newCard = {
      id: crypto.randomUUID(),
      ...body,
      status: "pending_inspection",
      created_at: now,
      updated_at: now,
      vehicle: mockVehicles.find((v) => v.id === body.vehicle_id) || null,
      owner: mockOwners.find((o) => o.id === body.owner_id) || null,
      mechanics: [],
      conditions: [],
    };
    return HttpResponse.json(newCard, { status: 201 });
  }),

  http.patch(`${base}/job-cards/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockJobCards[0],
      ...(body as object),
      updated_at: new Date().toISOString(),
    });
  }),

  http.patch(`${base}/job-cards/:id/status`, async ({ request, params }) => {
    const body = (await request.json()) as { status: string };
    const jc = mockJobCards.find((j) => j.id === params.id);
    if (!jc) {
      return HttpResponse.json({ detail: "Job card not found" }, { status: 404 });
    }

    const validTransitions: Record<string, string[]> = {
      pending_inspection: ["waiting_for_approval"],
      waiting_for_approval: ["in_repair"],
      in_repair: ["waiting_for_parts", "ready_for_testing"],
      waiting_for_parts: ["in_repair"],
      ready_for_testing: ["completed"],
      completed: [],
    };

    const allowed = validTransitions[jc.status] || [];
    if (!allowed.includes(body.status)) {
      return HttpResponse.json(
        { detail: `Cannot transition from ${jc.status} to ${body.status}` },
        { status: 422 },
      );
    }

    if (body.status === "completed") {
      const unreturned = mockToolCheckouts.filter(
        (co) => co.job_card_id === params.id && !co.checked_in_at,
      );
      if (unreturned.length > 0) {
        return HttpResponse.json(
          { detail: `${unreturned.length} tool(s) still checked out. Return all tools before completing.` },
          { status: 409 },
        );
      }
    }

    return HttpResponse.json({
      ...jc,
      status: body.status,
      updated_at: new Date().toISOString(),
    });
  }),

  // --- Performas ---

  http.get(`${base}/performas`, async ({ request }) => {
    const url = new URL(request.url);
    const jcId = url.searchParams.get("job_card_id");
    if (jcId) {
      return HttpResponse.json(mockPerformas.filter((p) => p.job_card_id === jcId));
    }
    return HttpResponse.json(mockPerformas);
  }),

  http.get(`${base}/performas/:id`, async ({ params }) => {
    const p = mockPerformas.find((perf) => perf.id === params.id);
    if (p) return HttpResponse.json(p);
    return HttpResponse.json({ detail: "Performa not found" }, { status: 404 });
  }),

  http.post(`${base}/performas`, async ({ request }) => {
    const body = (await request.json()) as {
      job_card_id: string;
      client_email?: string;
      line_items: Array<{ type: string; description: string; quantity: number; unit_price: number; inventory_item_id?: string }>;
    };
    const setting = mockSettings.find((s) => s.key === "vat_rate");
    const vatRate = parseFloat(setting?.value || "15.0");

    let subtotal = 0;
    const items = body.line_items.map((li) => {
      const total = li.quantity * li.unit_price;
      subtotal += total;
      return {
        id: crypto.randomUUID(),
        performa_id: "new",
        ...li,
        inventory_item_id: li.inventory_item_id || null,
        total_price: total,
      };
    });

    const vatAmount = subtotal * (vatRate / 100);
    const grandTotal = subtotal + vatAmount;

    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        job_card_id: body.job_card_id,
        version: 1,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        grand_total: grandTotal,
        status: "draft",
        client_email: body.client_email || null,
        sent_at: null,
        created_at: new Date().toISOString(),
        line_items: items,
      },
      { status: 201 },
    );
  }),

  http.patch(`${base}/performas/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: string };
    const p = mockPerformas.find((perf) => perf.id === params.id);
    if (p) {
      return HttpResponse.json({ ...p, status: body.status });
    }
    return HttpResponse.json({ detail: "Not found" }, { status: 404 });
  }),

  http.post(`${base}/performas/:id/send`, async ({ params, request }) => {
    const body = (await request.json()) as { client_email: string };
    const p = mockPerformas.find((perf) => perf.id === params.id);
    if (p) {
      return HttpResponse.json({
        ...p,
        client_email: body.client_email,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }
    return HttpResponse.json({ detail: "Not found" }, { status: 404 });
  }),

  http.post(`${base}/performas/:id/revise`, async ({ request }) => {
    const body = (await request.json()) as {
      line_items: Array<{ type: string; description: string; quantity: number; unit_price: number }>;
    };
    const p = mockPerformas[0];
    const vatRate = 15.0;

    let subtotal = 0;
    const items = body.line_items.map((li) => {
      const total = li.quantity * li.unit_price;
      subtotal += total;
      return {
        id: crypto.randomUUID(),
        performa_id: "revised",
        ...li,
        inventory_item_id: null,
        total_price: total,
      };
    });

    const vatAmount = subtotal * (vatRate / 100);

    return HttpResponse.json(
      {
        ...p,
        id: crypto.randomUUID(),
        version: (p?.version || 1) + 1,
        subtotal,
        vat_amount: vatAmount,
        grand_total: subtotal + vatAmount,
        status: "draft",
        sent_at: null,
        created_at: new Date().toISOString(),
        line_items: items,
      },
      { status: 201 },
    );
  }),

  // --- Inventory ---

  http.get(`${base}/inventory/locations`, async () => {
    return HttpResponse.json(mockLocations);
  }),

  http.post(`${base}/inventory/locations`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      { id: crypto.randomUUID(), ...body, created_at: new Date().toISOString() },
      { status: 201 },
    );
  }),

  http.get(`${base}/inventory/items`, async () => {
    return HttpResponse.json(
      mockInventoryItems.map((item) => ({
        ...item,
        stock_entries: mockStockEntries.filter((s) => s.item_id === item.id),
      })),
    );
  }),

  http.get(`${base}/inventory/items/:id`, async ({ params }) => {
    const item = mockInventoryItems.find((i) => i.id === params.id);
    if (item) {
      return HttpResponse.json({
        ...item,
        stock_entries: mockStockEntries.filter((s) => s.item_id === item.id),
      });
    }
    return HttpResponse.json({ detail: "Item not found" }, { status: 404 });
  }),

  http.post(`${base}/inventory/items`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        applicable_vehicle_types: body.applicable_vehicle_types || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stock_entries: [],
      },
      { status: 201 },
    );
  }),

  http.patch(`${base}/inventory/items/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockInventoryItems[0],
      ...(body as object),
      updated_at: new Date().toISOString(),
    });
  }),

  http.put(`${base}/inventory/stock`, async ({ request }) => {
    const body = (await request.json()) as {
      item_id: string;
      store_location_id: string;
      quantity: number;
    };
    return HttpResponse.json({
      id: crypto.randomUUID(),
      ...body,
    });
  }),

  // --- Tools ---

  http.get(`${base}/tools`, async () => {
    return HttpResponse.json(mockTools);
  }),

  http.get(`${base}/tools/:id`, async ({ params }) => {
    const tool = mockTools.find((t) => t.id === params.id);
    if (tool) return HttpResponse.json(tool);
    return HttpResponse.json({ detail: "Tool not found" }, { status: 404 });
  }),

  http.post(`${base}/tools`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        available_quantity: body.total_quantity,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.patch(`${base}/tools/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockTools[0], ...(body as object) });
  }),

  // --- Tool Checkouts ---

  http.get(`${base}/tools/checkouts`, async ({ request }) => {
    const url = new URL(request.url);
    const jcId = url.searchParams.get("job_card_id");
    const unreturned = url.searchParams.get("unreturned_only");

    let result = [...mockToolCheckouts];
    if (jcId) result = result.filter((co) => co.job_card_id === jcId);
    if (unreturned === "true") result = result.filter((co) => !co.checked_in_at);

    return HttpResponse.json(result);
  }),

  http.post(`${base}/tools/checkouts`, async ({ request }) => {
    const body = (await request.json()) as {
      tool_id: string;
      employee_id: string;
      job_card_id: string;
      quantity: number;
    };
    const tool = mockTools.find((t) => t.id === body.tool_id);
    if (tool && tool.available_quantity < body.quantity) {
      return HttpResponse.json(
        { detail: `Only ${tool.available_quantity} available. Requested ${body.quantity}.` },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        checked_out_at: new Date().toISOString(),
        checked_in_at: null,
        issued_by: mockUsers[0].id,
      },
      { status: 201 },
    );
  }),

  http.patch(`${base}/tools/checkouts/:id/return`, async ({ params }) => {
    const co = mockToolCheckouts.find((c) => c.id === params.id);
    if (co && co.checked_in_at) {
      return HttpResponse.json(
        { detail: "Tool already returned" },
        { status: 422 },
      );
    }
    return HttpResponse.json({
      ...(co || mockToolCheckouts[0]),
      checked_in_at: new Date().toISOString(),
    });
  }),

  // --- Employees ---

  http.get(`${base}/hr/employees`, async ({ request }) => {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active_only");
    if (activeOnly === "true") {
      return HttpResponse.json(mockEmployees.filter((e) => e.is_active));
    }
    return HttpResponse.json(mockEmployees);
  }),

  http.get(`${base}/hr/employees/:id`, async ({ params }) => {
    const emp = mockEmployees.find((e) => e.id === params.id);
    if (emp) return HttpResponse.json(emp);
    return HttpResponse.json({ detail: "Employee not found" }, { status: 404 });
  }),

  http.post(`${base}/hr/employees`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        ...body,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.patch(`${base}/hr/employees/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockEmployees[0], ...(body as object) });
  }),

  // --- Notifications ---

  http.get(`${base}/notifications`, async ({ request }) => {
    const url = new URL(request.url);
    const unread = url.searchParams.get("unread");
    if (unread === "true") {
      return HttpResponse.json(mockNotifications.filter((n) => !n.is_read));
    }
    return HttpResponse.json(mockNotifications);
  }),

  http.patch(`${base}/notifications/:id/read`, async ({ params }) => {
    const n = mockNotifications.find((notif) => notif.id === params.id);
    if (n) {
      return HttpResponse.json({ ...n, is_read: true });
    }
    return HttpResponse.json({ detail: "Not found" }, { status: 404 });
  }),

  // --- Audit Logs ---

  http.get(`${base}/audit-logs`, async ({ request }) => {
    const url = new URL(request.url);
    let result = [...mockAuditLogs];
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    if (entityType) result = result.filter((a) => a.entity_type === entityType);
    if (entityId) result = result.filter((a) => a.entity_id === entityId);
    return HttpResponse.json(result);
  }),

  // --- Health ---

  http.get("http://localhost:8000/health/live", async () => {
    return HttpResponse.json({ status: "ok" });
  }),
];
