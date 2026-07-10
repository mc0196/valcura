import { seedRequests } from "./seed";

/** Roles that can be impersonated via the demo's role switcher. */
export const ROLES = ["coordinator", "collaborator", "family", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** An elderly person the service cares for ("assistito"). */
export interface CareRecipient {
  id: string;
  name: string;
}

export const SERVICE_TYPES = ["groceries", "medications", "accompaniment", "errand"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const REQUEST_STATUSES = ["new", "assigned", "completed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** A service request in the coordinator's queue, from phone call or family app. */
export interface ServiceRequest {
  id: string;
  recipientId: string;
  service: ServiceType;
  /** Local calendar date (YYYY-MM-DD) the recipient asked the service for. */
  dueDate: string;
  notes: string;
  status: RequestStatus;
}

export type CreateRequestInput = Omit<ServiceRequest, "id" | "status">;

export interface AppState {
  role: Role;
  requests: ServiceRequest[];
}

/** Persistence boundary: localStorage in the app, an in-memory storage in tests. */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STATE_KEY = "valcura:state";

/** The demo's starting scenario. */
function seedScenario(): AppState {
  return { role: "coordinator", requests: seedRequests() };
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isServiceRequest(value: unknown): value is ServiceRequest {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<ServiceRequest>;
  return (
    typeof r.id === "string" &&
    typeof r.recipientId === "string" &&
    (SERVICE_TYPES as readonly string[]).includes(r.service as string) &&
    typeof r.dueDate === "string" &&
    typeof r.notes === "string" &&
    (REQUEST_STATUSES as readonly string[]).includes(r.status as string)
  );
}

/** Reads back the saved state; missing or corrupted data falls back to the seed scenario. */
function loadState(storage: Storage): AppState {
  const raw = storage.getItem(STATE_KEY);
  if (raw === null) return seedScenario();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null) {
      const { role, requests } = data as { role?: unknown; requests?: unknown };
      if (isRole(role) && Array.isArray(requests) && requests.every(isServiceRequest)) {
        return { role, requests };
      }
    }
  } catch {
    // invalid JSON: start over from the seed
  }
  return seedScenario();
}

export interface ValCuraStore {
  getState(): AppState;
  setRole(role: Role): void;
  /** Registers a request in the queue (status "new", newest first) and returns it. */
  createRequest(input: CreateRequestInput): ServiceRequest;
  resetDemo(): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(storage: Storage): ValCuraStore {
  let state = loadState(storage);
  const listeners = new Set<() => void>();

  function update(next: AppState): void {
    state = next;
    storage.setItem(STATE_KEY, JSON.stringify(state));
    for (const notify of listeners) notify();
  }

  return {
    getState: () => state,
    setRole: (role) => update({ ...state, role }),
    createRequest: (input) => {
      const request: ServiceRequest = { id: crypto.randomUUID(), status: "new", ...input };
      update({ ...state, requests: [request, ...state.requests] });
      return request;
    },
    resetDemo: () => update(seedScenario()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
