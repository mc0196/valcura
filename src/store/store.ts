/** Roles that can be impersonated via the demo's role switcher. */
export const ROLES = ["coordinator", "collaborator", "family", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface AppState {
  role: Role;
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
  return { role: "coordinator" };
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Reads back the saved state; missing or corrupted data falls back to the seed scenario. */
function loadState(storage: Storage): AppState {
  const raw = storage.getItem(STATE_KEY);
  if (raw === null) return seedScenario();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null && isRole((data as { role?: unknown }).role)) {
      return { role: (data as { role: Role }).role };
    }
  } catch {
    // invalid JSON: start over from the seed
  }
  return seedScenario();
}

export interface ValCuraStore {
  getState(): AppState;
  setRole(role: Role): void;
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
    setRole: (role) => update({ role }),
    resetDemo: () => update(seedScenario()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
