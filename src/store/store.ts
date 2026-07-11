import { CARE_RECIPIENTS, seedCollaborators, seedRequests } from "./seed";

/** Roles that can be impersonated via the demo's role switcher. */
export const ROLES = ["coordinator", "collaborator", "family", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Valley areas; suggestion ordering matches recipient and collaborator zones exactly. */
export const ZONES = ["Alta valle", "Media valle", "Bassa valle"] as const;
export type Zone = (typeof ZONES)[number];

/** An elderly person the service cares for ("assistito"). */
export interface CareRecipient {
  id: string;
  name: string;
  /** Valley area the recipient lives in; matched against collaborator zones. */
  zone: Zone;
}

/** A volunteer/collaborator who carries out service requests. */
export interface Collaborator {
  id: string;
  name: string;
  /** Valley area the collaborator usually covers. */
  zone: Zone;
  availableToday: boolean;
  /** Average family rating, 1–5 (seeded; fed by family reviews later). */
  ranking: number;
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
  /** The collaborator the request is assigned to; absent while status is "new". */
  assigneeId?: string;
}

export type CreateRequestInput = Omit<ServiceRequest, "id" | "status">;

export interface AppState {
  role: Role;
  requests: ServiceRequest[];
  collaborators: Collaborator[];
}

/** A collaborator proposed for a request, with the context the coordinator ranks them by. */
export interface CollaboratorSuggestion {
  collaborator: Collaborator;
  /** Requests currently assigned to this collaborator and not yet completed. */
  load: number;
  /** Whether the collaborator covers the zone the recipient lives in. */
  inRecipientZone: boolean;
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
  return { role: "coordinator", requests: seedRequests(), collaborators: seedCollaborators() };
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
    (REQUEST_STATUSES as readonly string[]).includes(r.status as string) &&
    (r.assigneeId === undefined || typeof r.assigneeId === "string")
  );
}

function isCollaborator(value: unknown): value is Collaborator {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Collaborator>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    (ZONES as readonly string[]).includes(c.zone as string) &&
    typeof c.availableToday === "boolean" &&
    typeof c.ranking === "number"
  );
}

/** Reads back the saved state; missing or corrupted data falls back to the seed scenario. */
function loadState(storage: Storage): AppState {
  const raw = storage.getItem(STATE_KEY);
  if (raw === null) return seedScenario();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null) {
      const { role, requests, collaborators } = data as {
        role?: unknown;
        requests?: unknown;
        collaborators?: unknown;
      };
      if (
        isRole(role) &&
        Array.isArray(requests) &&
        requests.every(isServiceRequest) &&
        Array.isArray(collaborators) &&
        collaborators.every(isCollaborator)
      ) {
        return { role, requests, collaborators };
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
  /**
   * Collaborators proposed for a request, best match first. The order rewards
   * availability today, covering the recipient's zone, a low current load and a
   * high ranking — in that priority. The coordinator always makes the final call.
   */
  suggestCollaborators(requestId: string): CollaboratorSuggestion[];
  /** Moves a "new" request to "assigned" with the chosen collaborator. */
  assignRequest(requestId: string, collaboratorId: string): void;
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

  function requireRequest(requestId: string): ServiceRequest {
    const request = state.requests.find((r) => r.id === requestId);
    if (request === undefined) throw new Error(`Unknown request: ${requestId}`);
    return request;
  }

  return {
    getState: () => state,
    setRole: (role) => update({ ...state, role }),
    createRequest: (input) => {
      const request: ServiceRequest = { id: crypto.randomUUID(), status: "new", ...input };
      update({ ...state, requests: [request, ...state.requests] });
      return request;
    },
    suggestCollaborators: (requestId) => {
      const request = requireRequest(requestId);
      const recipientZone = CARE_RECIPIENTS.find((r) => r.id === request.recipientId)?.zone;
      return state.collaborators
        .map((collaborator) => ({
          collaborator,
          load: state.requests.filter(
            (r) => r.assigneeId === collaborator.id && r.status === "assigned",
          ).length,
          inRecipientZone: collaborator.zone === recipientZone,
        }))
        .sort(
          (a, b) =>
            Number(b.collaborator.availableToday) - Number(a.collaborator.availableToday) ||
            Number(b.inRecipientZone) - Number(a.inRecipientZone) ||
            a.load - b.load ||
            b.collaborator.ranking - a.collaborator.ranking,
        );
    },
    assignRequest: (requestId, collaboratorId) => {
      const request = requireRequest(requestId);
      if (request.status !== "new") {
        throw new Error(`Request ${requestId} is already ${request.status}`);
      }
      if (!state.collaborators.some((c) => c.id === collaboratorId)) {
        throw new Error(`Unknown collaborator: ${collaboratorId}`);
      }
      update({
        ...state,
        requests: state.requests.map((r) =>
          r.id === requestId ? { ...r, status: "assigned", assigneeId: collaboratorId } : r,
        ),
      });
    },
    resetDemo: () => update(seedScenario()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
