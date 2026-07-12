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
  /** Average family rating, 1–5: the running mean of all ratings received. */
  ranking: number;
  /** How many family ratings the ranking averages over. */
  ratingsCount: number;
  /** How many families sent a thank-you along with their rating. */
  thanksCount: number;
}

/** A relative living outside the valley who follows a care recipient remotely. */
export interface FamilyMember {
  id: string;
  name: string;
  /** The care recipient this family member follows. */
  recipientId: string;
  /** Where the family member lives; makes "from afar" tangible in the demo. */
  city: string;
}

export const SERVICE_TYPES = ["groceries", "medications", "accompaniment", "errand"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** How a request enters the queue: coordinator phone call or the family app. */
export const REQUEST_CHANNELS = ["phone", "family"] as const;
export type RequestChannel = (typeof REQUEST_CHANNELS)[number];

export const REQUEST_STATUSES = ["new", "assigned", "completed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** The family's feedback on a completed intervention: a rating, at most once. */
export interface Review {
  /** Whole stars, 1–5. */
  rating: number;
  /** Optional thank-you message, shown to the collaborator. */
  thanks?: string;
}

/** A service request in the coordinator's queue, from phone call or family app. */
export interface ServiceRequest {
  id: string;
  recipientId: string;
  service: ServiceType;
  /** Origin channel; the queue treats both the same, but the source stays visible. */
  channel: RequestChannel;
  /** Local calendar date (YYYY-MM-DD) the recipient asked the service for. */
  dueDate: string;
  notes: string;
  status: RequestStatus;
  /** The collaborator the request is assigned to; absent while status is "new". */
  assigneeId?: string;
  /** The collaborator's closing note in plain language; present once status is "completed". */
  completionNote?: string;
  /** Local calendar date (YYYY-MM-DD) the mission was completed; present once status is "completed". */
  completedAt?: string;
  /** The family's rating and optional thank-you; only ever set on a completed request. */
  review?: Review;
}

export type CreateRequestInput = Omit<ServiceRequest, "id" | "status" | "review">;

export interface AppState {
  role: Role;
  requests: ServiceRequest[];
  collaborators: Collaborator[];
}

/** One completed intervention as the family's weekly report tells it. */
export interface ReportEntry {
  /** The completed request this entry comes from. */
  requestId: string;
  /** Completion date (YYYY-MM-DD). */
  date: string;
  service: ServiceType;
  collaboratorName: string;
  /** The collaborator's closing note, quoted verbatim in the report. */
  note: string;
}

/** The current week's report: a rolling seven-day window ending today. */
export interface WeeklyReport {
  /** First day covered (YYYY-MM-DD), six days before "to". */
  from: string;
  /** Last day covered (YYYY-MM-DD): today. */
  to: string;
  /** Completed interventions in the window, oldest first. */
  entries: ReportEntry[];
}

/** A past weekly report, pre-written and immutable: the archive the family browses. */
export interface PastReport {
  id: string;
  recipientId: string;
  /** Human label of the covered week, e.g. "29 giugno – 5 luglio 2026". */
  weekLabel: string;
  /** Curated paragraphs, already in the report's warm tone. */
  paragraphs: string[];
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

function toLocalIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Local calendar date (YYYY-MM-DD); requests and reports reason in local dates. */
export function localToday(): string {
  return toLocalIsoDate(new Date());
}

function localDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalIsoDate(d);
}

/** The demo's starting scenario. */
function seedScenario(): AppState {
  return { role: "coordinator", requests: seedRequests(), collaborators: seedCollaborators() };
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isReview(value: unknown): value is Review {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Partial<Review>;
  return (
    typeof review.rating === "number" &&
    (review.thanks === undefined || typeof review.thanks === "string")
  );
}

function isServiceRequest(value: unknown): value is ServiceRequest {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<ServiceRequest>;
  return (
    typeof r.id === "string" &&
    typeof r.recipientId === "string" &&
    (SERVICE_TYPES as readonly string[]).includes(r.service as string) &&
    (REQUEST_CHANNELS as readonly string[]).includes(r.channel as string) &&
    typeof r.dueDate === "string" &&
    typeof r.notes === "string" &&
    (REQUEST_STATUSES as readonly string[]).includes(r.status as string) &&
    (r.assigneeId === undefined || typeof r.assigneeId === "string") &&
    (r.completionNote === undefined || typeof r.completionNote === "string") &&
    (r.completedAt === undefined || typeof r.completedAt === "string") &&
    (r.review === undefined || isReview(r.review))
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
    typeof c.ranking === "number" &&
    typeof c.ratingsCount === "number" &&
    typeof c.thanksCount === "number"
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
  /** Moves an "assigned" request to "completed"; the closing note is required. */
  completeRequest(requestId: string, note: string): void;
  /**
   * Records the family's rating (1–5 whole stars, optional thank-you) on a
   * completed request, once, and folds it into the collaborator's ranking as a
   * running average. A thank-you also bumps the collaborator's thanks count.
   */
  rateRequest(requestId: string, rating: number, thanks?: string): void;
  /**
   * The recipient's report for the current week: the interventions completed in
   * the last seven days, oldest first, each with the collaborator's closing note.
   */
  currentReport(recipientId: string): WeeklyReport;
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
    completeRequest: (requestId, note) => {
      const request = requireRequest(requestId);
      if (request.status !== "assigned") {
        throw new Error(`Request ${requestId} is ${request.status}, not assigned`);
      }
      const completionNote = note.trim();
      if (completionNote === "") {
        throw new Error(`Request ${requestId} needs a closing note to be completed`);
      }
      update({
        ...state,
        requests: state.requests.map((r) =>
          r.id === requestId
            ? { ...r, status: "completed", completionNote, completedAt: localToday() }
            : r,
        ),
      });
    },
    rateRequest: (requestId, rating, thanks) => {
      const request = requireRequest(requestId);
      if (request.status !== "completed") {
        throw new Error(`Request ${requestId} is ${request.status}, not completed`);
      }
      if (request.review !== undefined) {
        throw new Error(`Request ${requestId} has already been rated`);
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error(`Rating must be a whole number of stars between 1 and 5, got ${rating}`);
      }
      const thankYou = thanks?.trim();
      const review: Review =
        thankYou === undefined || thankYou === "" ? { rating } : { rating, thanks: thankYou };
      update({
        ...state,
        requests: state.requests.map((r) => (r.id === requestId ? { ...r, review } : r)),
        collaborators: state.collaborators.map((c) => {
          if (c.id !== request.assigneeId) return c;
          const count = c.ratingsCount + 1;
          // Two decimals: enough to order suggestions, free of float noise.
          const ranking = Math.round(((c.ranking * c.ratingsCount + rating) / count) * 100) / 100;
          return {
            ...c,
            ranking,
            ratingsCount: count,
            thanksCount: review.thanks === undefined ? c.thanksCount : c.thanksCount + 1,
          };
        }),
      });
    },
    currentReport: (recipientId) => {
      const to = localToday();
      const from = localDaysAgo(6);
      const entries = state.requests
        .filter(
          (r): r is ServiceRequest & { completedAt: string } =>
            r.recipientId === recipientId &&
            r.status === "completed" &&
            r.completedAt !== undefined &&
            r.completedAt >= from &&
            r.completedAt <= to,
        )
        .map((r) => ({
          requestId: r.id,
          date: r.completedAt,
          service: r.service,
          collaboratorName:
            state.collaborators.find((c) => c.id === r.assigneeId)?.name ??
            "Collaboratore sconosciuto",
          note: r.completionNote ?? "",
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { from, to, entries };
    },
    resetDemo: () => update(seedScenario()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
