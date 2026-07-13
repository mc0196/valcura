import {
  CARE_RECIPIENTS,
  FAMILY_MEMBERS,
  seedCollaborators,
  seedPlans,
  seedRequests,
  seedTeams,
} from "./seed";

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

export const MAX_BACKUP_COLLABORATORS = 2;

/**
 * The collaborators a family relies on: continuity is the default, so the
 * primary is suggested first and the backups step in when life happens.
 */
export interface CareTeam {
  /** The collaborator the family knows best; suggested first while available. */
  primaryId: string;
  /** Fallbacks in preference order when the primary is unavailable; at most two. */
  backupIds: string[];
}

export const PLAN_IDS = ["basic", "premium", "family-care"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** How often the family receives its periodic report. */
export const REPORT_FREQUENCIES = ["monthly", "weekly"] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

/** A subscription plan: the commercial offer on two axes, volume and report. */
export interface Plan {
  id: PlanId;
  name: string;
  /** Interventions included per calendar month. */
  monthlyInterventions: number;
  /** Drives the family view's current report window. */
  reportFrequency: ReportFrequency;
  /** Family Care only: a periodic phone call on top of the weekly report. */
  includesCall: boolean;
}

/** The plan catalog, essential to richest. Static, like the recipients roster. */
export const PLANS: readonly Plan[] = [
  {
    id: "basic",
    name: "Basic",
    monthlyInterventions: 4,
    reportFrequency: "monthly",
    includesCall: false,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyInterventions: 8,
    reportFrequency: "weekly",
    includesCall: false,
  },
  {
    id: "family-care",
    name: "Family Care",
    monthlyInterventions: 12,
    reportFrequency: "weekly",
    includesCall: true,
  },
];

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
  /** Each client's active plan, keyed by recipient id. */
  planByRecipient: Record<string, PlanId>;
  /** Each family's care team (primary + backups), keyed by family member id. */
  teamByFamily: Record<string, CareTeam>;
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

/** The current periodic report; its window follows the client's plan. */
export interface CurrentReport {
  /** The plan's report frequency at the time of reading. */
  frequency: ReportFrequency;
  /** First day covered (YYYY-MM-DD): six days back when weekly, the 1st of the month when monthly. */
  from: string;
  /** Last day covered (YYYY-MM-DD): today. */
  to: string;
  /** Completed interventions in the window, oldest first. */
  entries: ReportEntry[];
}

/** A past periodic report, pre-written and immutable: the archive the family browses. */
export interface PastReport {
  id: string;
  recipientId: string;
  /**
   * Human label of the covered period, matching the client's plan frequency:
   * "Settimana 29 giugno – 5 luglio 2026" or "Giugno 2026".
   */
  periodLabel: string;
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
  /** The collaborator's place in the requesting family's care team, if any. */
  teamRole?: "primary" | "backup";
  /** Free to take this request: active today and not already booked on its date. */
  availableForRequest: boolean;
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

/** First day (YYYY-MM-01) of the current local month. */
function localMonthStart(): string {
  return `${localToday().slice(0, 7)}-01`;
}

/** The demo's starting scenario. */
function seedScenario(): AppState {
  return {
    role: "coordinator",
    requests: seedRequests(),
    collaborators: seedCollaborators(),
    planByRecipient: seedPlans(),
    teamByFamily: seedTeams(),
  };
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

/** Every client must keep a valid plan, or the whole saved state is stale. */
function isPlanByRecipient(value: unknown): value is Record<string, PlanId> {
  if (typeof value !== "object" || value === null) return false;
  const plans = value as Record<string, unknown>;
  return (
    CARE_RECIPIENTS.every((r) => plans[r.id] !== undefined) &&
    Object.values(plans).every((p) => (PLAN_IDS as readonly string[]).includes(p as string))
  );
}

/** A valid care team only references existing collaborators, without overlaps. */
function isCareTeam(value: unknown, collaboratorIds: readonly string[]): value is CareTeam {
  if (typeof value !== "object" || value === null) return false;
  const team = value as Partial<CareTeam>;
  return (
    typeof team.primaryId === "string" &&
    collaboratorIds.includes(team.primaryId) &&
    Array.isArray(team.backupIds) &&
    team.backupIds.length <= MAX_BACKUP_COLLABORATORS &&
    team.backupIds.every(
      (id) => typeof id === "string" && collaboratorIds.includes(id) && id !== team.primaryId,
    ) &&
    new Set(team.backupIds).size === team.backupIds.length
  );
}

/** Every family must keep a valid care team, or the whole saved state is stale. */
function isTeamByFamily(
  value: unknown,
  collaboratorIds: readonly string[],
): value is Record<string, CareTeam> {
  if (typeof value !== "object" || value === null) return false;
  const teams = value as Record<string, unknown>;
  return FAMILY_MEMBERS.every((m) => isCareTeam(teams[m.id], collaboratorIds));
}

/** Reads back the saved state; missing or corrupted data falls back to the seed scenario. */
function loadState(storage: Storage): AppState {
  const raw = storage.getItem(STATE_KEY);
  if (raw === null) return seedScenario();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null) {
      const { role, requests, collaborators, planByRecipient, teamByFamily } = data as {
        role?: unknown;
        requests?: unknown;
        collaborators?: unknown;
        planByRecipient?: unknown;
        teamByFamily?: unknown;
      };
      if (
        isRole(role) &&
        Array.isArray(requests) &&
        requests.every(isServiceRequest) &&
        Array.isArray(collaborators) &&
        collaborators.every(isCollaborator) &&
        isPlanByRecipient(planByRecipient) &&
        isTeamByFamily(
          teamByFamily,
          collaborators.map((c) => c.id),
        )
      ) {
        return { role, requests, collaborators, planByRecipient, teamByFamily };
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
   * Collaborators proposed for a request. Continuity first: the family's
   * primary opens the list while free for the request's date, then the backups
   * in preference order. Everyone else follows, ranked by availability for the
   * date, covering the recipient's zone, a low current load and a high ranking
   * — in that priority. The coordinator always makes the final call.
   */
  suggestCollaborators(requestId: string): CollaboratorSuggestion[];
  /** The family's care team (primary + backups), as configured by the Admin. */
  careTeamFor(familyId: string): CareTeam;
  /** Reconfigures a family's care team: one primary, up to two distinct backups. */
  setCareTeam(familyId: string, team: CareTeam): void;
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
  /** The client's active plan; report frequency and monthly volume follow it. */
  planFor(recipientId: string): Plan;
  /** Switches the client to another plan, effective immediately (report frequency included). */
  changePlan(recipientId: string, planId: PlanId): void;
  /**
   * Interventions booked for the current calendar month (by due date, any
   * status): what counts against the plan's monthly volume.
   */
  monthlyUsage(recipientId: string): number;
  /**
   * The recipient's current periodic report: the interventions completed in the
   * plan's window (last seven days, or the month so far on a monthly plan),
   * oldest first, each with the collaborator's closing note.
   */
  currentReport(recipientId: string): CurrentReport;
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

  function activePlan(recipientId: string): Plan {
    const planId = state.planByRecipient[recipientId];
    const plan = PLANS.find((p) => p.id === planId);
    if (plan === undefined) throw new Error(`Unknown client: ${recipientId}`);
    return plan;
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
      const family = FAMILY_MEMBERS.find((m) => m.recipientId === request.recipientId);
      const team = family === undefined ? undefined : state.teamByFamily[family.id];
      // 0 for the primary, 1.. for the backups in order, Infinity outside the team.
      const teamRank = (collaboratorId: string): number => {
        if (team === undefined) return Infinity;
        if (collaboratorId === team.primaryId) return 0;
        const backupIndex = team.backupIds.indexOf(collaboratorId);
        return backupIndex === -1 ? Infinity : backupIndex + 1;
      };
      return state.collaborators
        .map((collaborator) => {
          const rank = teamRank(collaborator.id);
          return {
            collaborator,
            load: state.requests.filter(
              (r) => r.assigneeId === collaborator.id && r.status === "assigned",
            ).length,
            inRecipientZone: collaborator.zone === recipientZone,
            teamRole:
              rank === 0 ? ("primary" as const) : rank === Infinity ? undefined : ("backup" as const),
            availableForRequest:
              collaborator.availableToday &&
              !state.requests.some(
                (r) =>
                  r.status === "assigned" &&
                  r.assigneeId === collaborator.id &&
                  r.dueDate === request.dueDate,
              ),
          };
        })
        .sort((a, b) => {
          // Continuity wins: team members free for the date come before anyone else.
          const aTeam = a.availableForRequest ? teamRank(a.collaborator.id) : Infinity;
          const bTeam = b.availableForRequest ? teamRank(b.collaborator.id) : Infinity;
          if (aTeam !== bTeam) return aTeam - bTeam;
          return (
            Number(b.availableForRequest) - Number(a.availableForRequest) ||
            Number(b.inRecipientZone) - Number(a.inRecipientZone) ||
            a.load - b.load ||
            b.collaborator.ranking - a.collaborator.ranking
          );
        });
    },
    careTeamFor: (familyId) => {
      const team = state.teamByFamily[familyId];
      if (team === undefined) throw new Error(`Unknown family: ${familyId}`);
      return team;
    },
    setCareTeam: (familyId, team) => {
      if (!FAMILY_MEMBERS.some((m) => m.id === familyId)) {
        throw new Error(`Unknown family: ${familyId}`);
      }
      if (!isCareTeam(team, state.collaborators.map((c) => c.id))) {
        throw new Error(
          `Invalid care team for ${familyId}: one known primary and up to ` +
            `${MAX_BACKUP_COLLABORATORS} distinct known backups`,
        );
      }
      update({
        ...state,
        teamByFamily: {
          ...state.teamByFamily,
          [familyId]: { primaryId: team.primaryId, backupIds: [...team.backupIds] },
        },
      });
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
    planFor: (recipientId) => activePlan(recipientId),
    changePlan: (recipientId, planId) => {
      activePlan(recipientId);
      if (!(PLAN_IDS as readonly string[]).includes(planId)) {
        throw new Error(`Unknown plan: ${planId}`);
      }
      update({ ...state, planByRecipient: { ...state.planByRecipient, [recipientId]: planId } });
    },
    monthlyUsage: (recipientId) => {
      const month = localToday().slice(0, 7);
      return state.requests.filter(
        (r) => r.recipientId === recipientId && r.dueDate.slice(0, 7) === month,
      ).length;
    },
    currentReport: (recipientId) => {
      const { reportFrequency: frequency } = activePlan(recipientId);
      const to = localToday();
      const from = frequency === "weekly" ? localDaysAgo(6) : localMonthStart();
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
      return { frequency, from, to, entries };
    },
    resetDemo: () => update(seedScenario()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
