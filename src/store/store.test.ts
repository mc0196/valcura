import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, localToday, type PlanId, type Storage } from "./store";
import { CARE_RECIPIENTS, FAMILY_MEMBERS, PAST_REPORTS, seedCollaborators, seedTeams } from "./seed";

/** In-memory storage: stands in for localStorage in tests (external boundary). */
function inMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Local calendar date (YYYY-MM-DD) at an offset from today, for month-boundary cases. */
function localDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** A valid saved plan assignment covering every seeded client. */
const SAVED_PLANS: Record<string, PlanId> = {
  "a-maria": "premium",
  "a-giovanni": "premium",
  "a-pierina": "basic",
  "a-ercole": "basic",
};

describe("ValCura store", () => {
  it("starts from the seed scenario, as coordinator, when nothing is saved", () => {
    const store = createStore(inMemoryStorage());

    expect(store.getState().role).toBe("coordinator");
  });

  it("keeps the chosen role across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    createStore(storage).setRole("family");

    const storeAfterReload = createStore(storage);

    expect(storeAfterReload.getState().role).toBe("family");
  });

  it("resets to the seed scenario, even across a reload", () => {
    const storage = inMemoryStorage();
    const store = createStore(storage);
    store.setRole("admin");

    store.resetDemo();

    expect(store.getState().role).toBe("coordinator");
    expect(createStore(storage).getState().role).toBe("coordinator");
  });

  it("does not break on corrupted saved data: starts over from the seed", () => {
    const storage = inMemoryStorage();
    storage.setItem("valcura:state", "{not-json");

    expect(createStore(storage).getState().role).toBe("coordinator");
  });

  it("seeds the queue with requests covering every status, so the demo starts alive", () => {
    const store = createStore(inMemoryStorage());

    const statuses = store.getState().requests.map((r) => r.status);

    expect(statuses).toContain("new");
    expect(statuses).toContain("assigned");
    expect(statuses).toContain("completed");
  });

  it("puts a created request at the top of the queue, with status \"new\"", () => {
    const store = createStore(inMemoryStorage());

    const created = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "Citofonare due volte",
    });

    const [first] = store.getState().requests;
    expect(first).toEqual(created);
    expect(first.status).toBe("new");
    expect(first).toMatchObject({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "Citofonare due volte",
    });
  });

  it("keeps a created request across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const created = createStore(storage).createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-15",
      notes: "",
    });

    const storeAfterReload = createStore(storage);

    expect(storeAfterReload.getState().requests).toContainEqual(created);
  });

  it("drops created requests on reset: the queue is back to the seed scenario", () => {
    const store = createStore(inMemoryStorage());
    const seedIds = store.getState().requests.map((r) => r.id);
    store.createRequest({
      recipientId: "a-maria",
      service: "medications",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    store.resetDemo();

    expect(store.getState().requests.map((r) => r.id)).toEqual(seedIds);
  });

  it("falls back to the seed when saved requests have an invalid shape", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({ role: "family", requests: [{ id: "r1", status: "teleported" }] }),
    );

    const store = createStore(storage);

    expect(store.getState().role).toBe("coordinator");
    expect(store.getState().requests.length).toBeGreaterThan(0);
  });

  it("creates a family request that joins the queue as new, tracked to its channel", () => {
    const store = createStore(inMemoryStorage());

    const created = store.createRequest({
      recipientId: "a-maria",
      service: "medications",
      channel: "family",
      dueDate: "2026-07-13",
      notes: "La mamma ha finito le medicine per la pressione",
    });

    const [first] = store.getState().requests;
    expect(first).toEqual(created);
    expect(first.status).toBe("new");
    expect(first.channel).toBe("family");
  });

  it("keeps the origin channel across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const created = createStore(storage).createRequest({
      recipientId: "a-pierina",
      service: "errand",
      channel: "family",
      dueDate: "2026-07-13",
      notes: "",
    });

    const reloaded = createStore(storage).getState().requests.find((r) => r.id === created.id);

    expect(reloaded?.channel).toBe("family");
  });

  it("lets a family request flow through assignment like a phone one", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-13",
      notes: "",
    });

    store.assignRequest(request.id, "c-luca");

    const assigned = store.getState().requests.find((r) => r.id === request.id);
    expect(assigned?.status).toBe("assigned");
    expect(assigned?.channel).toBe("family");
  });

  it("seeds requests from both entry channels, so the demo shows them side by side", () => {
    const store = createStore(inMemoryStorage());

    const channels = store.getState().requests.map((r) => r.channel);

    expect(channels).toContain("phone");
    expect(channels).toContain("family");
  });

  it("seeds a still-pending request from the family channel, visible in the queue", () => {
    const store = createStore(inMemoryStorage());

    const pendingFromFamily = store
      .getState()
      .requests.filter((r) => r.status === "new" && r.channel === "family");

    expect(pendingFromFamily.length).toBeGreaterThan(0);
  });

  it("seeds an intervention already rated with a thank-you, so recognitions start alive", () => {
    const store = createStore(inMemoryStorage());

    const rated = store.getState().requests.filter((r) => r.review !== undefined);

    expect(rated.length).toBeGreaterThan(0);
    expect(rated.every((r) => r.status === "completed")).toBe(true);
    expect(rated.some((r) => r.review?.thanks !== undefined)).toBe(true);
  });

  it("keeps a completed intervention unrated in the seed, so the pitch can rate it live", () => {
    const store = createStore(inMemoryStorage());

    const ratable = store
      .getState()
      .requests.filter((r) => r.status === "completed" && r.review === undefined);

    expect(ratable.length).toBeGreaterThan(0);
  });

  it("falls back to the seed when saved requests predate the origin channel", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({
        role: "family",
        requests: [
          {
            id: "r-old",
            recipientId: "a-maria",
            service: "groceries",
            dueDate: "2026-07-01",
            notes: "",
            status: "new",
          },
        ],
        collaborators: [],
      }),
    );

    const store = createStore(storage);

    expect(store.getState().role).toBe("coordinator");
    expect(store.getState().requests.every((r) => r.channel !== undefined)).toBe(true);
  });

  it("suggests the seed collaborators for a new request, with zone, availability, load and ranking", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (const suggestion of suggestions) {
      expect(suggestion.collaborator.name).toBeTypeOf("string");
      expect(suggestion.collaborator.zone).toBeTypeOf("string");
      expect(suggestion.collaborator.availableToday).toBeTypeOf("boolean");
      expect(suggestion.collaborator.ranking).toBeGreaterThan(0);
      expect(suggestion.load).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts unavailable collaborators last, even with the highest ranking", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-pierina",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    // Omar covers Pierina's own zone and outranks everyone available, but is off today.
    expect(suggestions.at(-1)?.collaborator.id).toBe("c-omar");
  });

  it("prefers collaborators covering the recipient's zone among the available ones", () => {
    const store = createStore(inMemoryStorage());
    // Neutralize Maria's care team (off-duty primary, no backups): the generic pool decides.
    store.setCareTeam("f-anna", { primaryId: "c-omar", backupIds: [] });
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const ids = store.suggestCollaborators(request.id).map((s) => s.collaborator.id);

    // Sara has the best ranking but is up-valley; Maria's zone comes first.
    expect(ids.indexOf("c-sara")).toBeGreaterThan(ids.indexOf("c-luca"));
    expect(ids.indexOf("c-sara")).toBeGreaterThan(ids.indexOf("c-franca"));
  });

  it("breaks ties in the generic pool by higher ranking", () => {
    const store = createStore(inMemoryStorage());
    // Neutralize Maria's care team (off-duty primary, no backups): the generic pool decides.
    store.setCareTeam("f-anna", { primaryId: "c-omar", backupIds: [] });
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const ids = store.suggestCollaborators(request.id).map((s) => s.collaborator.id);

    // Luca and Franca both cover Maria's zone, are free and unloaded; Luca ranks 4.7 vs 4.5.
    expect(ids.indexOf("c-luca")).toBeLessThan(ids.indexOf("c-franca"));
  });

  it("opens the list with the family's primary, then the backups, then everyone else", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    // Anna's team: Franca primary, Luca backup; Luca outranks Franca but continuity wins.
    expect(suggestions.map((s) => s.collaborator.id)).toEqual([
      "c-franca",
      "c-luca",
      "c-sara",
      "c-omar",
    ]);
    expect(suggestions[0].teamRole).toBe("primary");
    expect(suggestions[1].teamRole).toBe("backup");
    expect(suggestions[2].teamRole).toBeUndefined();
  });

  it("falls back to the backups, in order, when the primary is off today", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-pierina",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-16",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    // Carla's team: Omar primary but off today, backups Franca then Luca.
    expect(suggestions.map((s) => s.collaborator.id)).toEqual([
      "c-franca",
      "c-luca",
      "c-sara",
      "c-omar",
    ]);
    expect(suggestions[0].teamRole).toBe("backup");
    expect(suggestions.at(-1)?.teamRole).toBe("primary");
    expect(suggestions.at(-1)?.availableForRequest).toBe(false);
  });

  it("skips a team member already booked on the request's date", () => {
    const store = createStore(inMemoryStorage());
    const other = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-14",
      notes: "",
    });
    store.assignRequest(other.id, "c-franca");
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-14",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    // Franca (Anna's primary) is booked on the 14th: Luca the backup opens the list.
    expect(suggestions[0].collaborator.id).toBe("c-luca");
    const franca = suggestions.find((s) => s.collaborator.id === "c-franca");
    expect(franca?.availableForRequest).toBe(false);
    expect(franca?.teamRole).toBe("primary");
  });

  it("keeps the primary first on a different date, even when booked elsewhere", () => {
    const store = createStore(inMemoryStorage());
    const other = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-14",
      notes: "",
    });
    store.assignRequest(other.id, "c-franca");
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-15",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    expect(suggestions[0].collaborator.id).toBe("c-franca");
    expect(suggestions[0].teamRole).toBe("primary");
  });

  it("assigns a new request to the chosen collaborator, moving it to \"assigned\"", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    store.assignRequest(request.id, "c-luca");

    const assigned = store.getState().requests.find((r) => r.id === request.id);
    expect(assigned?.status).toBe("assigned");
    expect(assigned?.assigneeId).toBe("c-luca");
  });

  it("refuses to assign a request that is no longer new, keeping its collaborator", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");

    expect(() => store.assignRequest(request.id, "c-franca")).toThrow();

    const assigned = store.getState().requests.find((r) => r.id === request.id);
    expect(assigned?.assigneeId).toBe("c-luca");
  });

  it("books a collaborator once per date: an assignment that day pushes them down", () => {
    const store = createStore(inMemoryStorage());
    const first = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    const second = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(second.id);

    // Luca is Elio's primary, but he is already booked on the 12th: Franca steps in.
    const ids = suggestions.map((s) => s.collaborator.id);
    expect(ids.indexOf("c-franca")).toBeLessThan(ids.indexOf("c-luca"));
    expect(suggestions.find((s) => s.collaborator.id === "c-luca")?.load).toBe(1);
  });

  it("prefers a lighter load among otherwise equal collaborators in the generic pool", () => {
    const store = createStore(inMemoryStorage());
    // Neutralize Maria's care team (off-duty primary, no backups): the generic pool decides.
    store.setCareTeam("f-anna", { primaryId: "c-omar", backupIds: [] });
    const first = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-13",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    const second = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const ids = store.suggestCollaborators(second.id).map((s) => s.collaborator.id);

    // Both free on the 12th and in zone; Luca outranks Franca but carries an open assignment.
    expect(ids.indexOf("c-franca")).toBeLessThan(ids.indexOf("c-luca"));
  });

  it("refuses to assign to an unknown collaborator, leaving the request new", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    expect(() => store.assignRequest(request.id, "c-nobody")).toThrow();

    expect(store.getState().requests.find((r) => r.id === request.id)?.status).toBe("new");
  });

  it("keeps an assignment across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const store = createStore(storage);
    const request = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-15",
      notes: "",
    });
    store.assignRequest(request.id, "c-franca");

    const reloaded = createStore(storage).getState().requests.find((r) => r.id === request.id);

    expect(reloaded?.status).toBe("assigned");
    expect(reloaded?.assigneeId).toBe("c-franca");
  });

  it("completes an assigned request with the closing note, keeping its collaborator", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "accompaniment",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-franca");

    store.completeRequest(request.id, "  La sig.ra Maria sta bene, due chiacchiere in cucina  ");

    const completed = store.getState().requests.find((r) => r.id === request.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.assigneeId).toBe("c-franca");
    expect(completed?.completionNote).toBe("La sig.ra Maria sta bene, due chiacchiere in cucina");
  });

  it("refuses to complete a request that was never assigned", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    expect(() => store.completeRequest(request.id, "Tutto fatto")).toThrow();

    expect(store.getState().requests.find((r) => r.id === request.id)?.status).toBe("new");
  });

  it("refuses to complete an already completed request, keeping the first note", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa consegnata, tutto bene");

    expect(() => store.completeRequest(request.id, "Un'altra nota")).toThrow();

    const completed = store.getState().requests.find((r) => r.id === request.id);
    expect(completed?.completionNote).toBe("Spesa consegnata, tutto bene");
  });

  it("refuses to complete without a closing note, leaving the request assigned", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");

    expect(() => store.completeRequest(request.id, "   ")).toThrow();

    expect(store.getState().requests.find((r) => r.id === request.id)?.status).toBe("assigned");
  });

  it("keeps a completion and its note across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const store = createStore(storage);
    const request = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-15",
      notes: "",
    });
    store.assignRequest(request.id, "c-franca");
    store.completeRequest(request.id, "Pacco ritirato in posta e consegnato");

    const reloaded = createStore(storage).getState().requests.find((r) => r.id === request.id);

    expect(reloaded?.status).toBe("completed");
    expect(reloaded?.completionNote).toBe("Pacco ritirato in posta e consegnato");
  });

  it("frees the collaborator's load once their mission is completed", () => {
    const store = createStore(inMemoryStorage());
    const first = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    store.completeRequest(first.id, "Spesa fatta, tutto bene");
    const second = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });

    const luca = store.suggestCollaborators(second.id).find((s) => s.collaborator.id === "c-luca");

    expect(luca?.load).toBe(0);
  });

  it("notifies listeners when a mission is completed", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-pierina",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-omar");
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.completeRequest(request.id, "Spesa consegnata alla sig.ra Pierina");

    expect(notifications).toBe(1);
  });

  it("records the family's rating and thank-you on a completed intervention", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta, tutto bene");

    store.rateRequest(request.id, 5, "  Grazie Luca, la mamma era proprio contenta  ");

    const rated = store.getState().requests.find((r) => r.id === request.id);
    expect(rated?.review).toEqual({
      rating: 5,
      thanks: "Grazie Luca, la mamma era proprio contenta",
    });
  });

  it("records a rating without a thank-you when the family leaves none", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");

    store.rateRequest(request.id, 4, "   ");

    const rated = store.getState().requests.find((r) => r.id === request.id);
    expect(rated?.review).toEqual({ rating: 4 });
  });

  it("folds a rating into the collaborator's ranking as a running average", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");

    store.rateRequest(request.id, 1);

    // Luca is seeded at 4.7 over 9 ratings: (4.7 * 9 + 1) / 10 = 4.33.
    const luca = store.getState().collaborators.find((c) => c.id === "c-luca");
    expect(luca?.ranking).toBe(4.33);
    expect(luca?.ratingsCount).toBe(10);
  });

  it("counts the thank-you towards the collaborator's recognitions", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");
    const thanksBefore = store.getState().collaborators.find((c) => c.id === "c-luca")!.thanksCount;

    store.rateRequest(request.id, 5, "Grazie di cuore");

    const luca = store.getState().collaborators.find((c) => c.id === "c-luca");
    expect(luca?.thanksCount).toBe(thanksBefore + 1);
  });

  it("leaves the thanks count alone when the rating comes without a thank-you", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");
    const thanksBefore = store.getState().collaborators.find((c) => c.id === "c-luca")!.thanksCount;

    store.rateRequest(request.id, 3);

    expect(store.getState().collaborators.find((c) => c.id === "c-luca")?.thanksCount).toBe(
      thanksBefore,
    );
  });

  it("reorders the generic pool once a rating moves the ranking", () => {
    const store = createStore(inMemoryStorage());
    // Neutralize Maria's care team (off-duty primary, no backups): the generic pool decides.
    store.setCareTeam("f-anna", { primaryId: "c-omar", backupIds: [] });
    const first = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    store.completeRequest(first.id, "Spesa fatta");
    store.rateRequest(first.id, 1);
    const second = store.createRequest({
      recipientId: "a-maria",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-13",
      notes: "",
    });

    const ids = store.suggestCollaborators(second.id).map((s) => s.collaborator.id);

    // Luca started ahead of Franca (4.7 vs 4.5); one bad rating drops him to 4.33.
    expect(ids.indexOf("c-franca")).toBeLessThan(ids.indexOf("c-luca"));
  });

  it("keeps the family's primary first even when a low rating drops their ranking", () => {
    const store = createStore(inMemoryStorage());
    const first = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-franca");
    store.completeRequest(first.id, "Spesa fatta");
    store.rateRequest(first.id, 1);
    const second = store.createRequest({
      recipientId: "a-maria",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-13",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(second.id);

    // Franca drops to 4.23, well below Luca's 4.7 — continuity still puts her first.
    expect(suggestions[0].collaborator.id).toBe("c-franca");
    expect(suggestions[0].teamRole).toBe("primary");
  });

  it("refuses to rate an intervention that is not completed yet", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");

    expect(() => store.rateRequest(request.id, 5)).toThrow();

    expect(store.getState().collaborators.find((c) => c.id === "c-luca")?.ratingsCount).toBe(9);
  });

  it("refuses a second rating, keeping the first review and ranking", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");
    store.rateRequest(request.id, 5, "Grazie!");

    expect(() => store.rateRequest(request.id, 1)).toThrow();

    const rated = store.getState().requests.find((r) => r.id === request.id);
    expect(rated?.review).toEqual({ rating: 5, thanks: "Grazie!" });
    expect(store.getState().collaborators.find((c) => c.id === "c-luca")?.ratingsCount).toBe(10);
  });

  it("refuses ratings outside 1–5 whole stars, leaving the ranking untouched", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");

    expect(() => store.rateRequest(request.id, 0)).toThrow();
    expect(() => store.rateRequest(request.id, 6)).toThrow();
    expect(() => store.rateRequest(request.id, 4.5)).toThrow();

    const luca = store.getState().collaborators.find((c) => c.id === "c-luca");
    expect(luca?.ranking).toBe(4.7);
    expect(store.getState().requests.find((r) => r.id === request.id)?.review).toBeUndefined();
  });

  it("keeps the review and the updated ranking across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const store = createStore(storage);
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");
    store.rateRequest(request.id, 1, "Grazie comunque");

    const reloaded = createStore(storage).getState();

    expect(reloaded.requests.find((r) => r.id === request.id)?.review).toEqual({
      rating: 1,
      thanks: "Grazie comunque",
    });
    expect(reloaded.collaborators.find((c) => c.id === "c-luca")?.ranking).toBe(4.33);
  });

  it("notifies listeners when a rating lands", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.rateRequest(request.id, 5);

    expect(notifications).toBe(1);
  });

  it("falls back to the seed when saved collaborators predate ratings counters", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({
        role: "family",
        requests: [],
        collaborators: [
          {
            id: "c-old",
            name: "Vecchio Collaboratore",
            zone: "Media valle",
            availableToday: true,
            ranking: 4.2,
          },
        ],
      }),
    );

    const store = createStore(storage);

    expect(store.getState().role).toBe("coordinator");
    expect(
      store.getState().collaborators.every((c) => typeof c.ratingsCount === "number"),
    ).toBe(true);
  });

  it("tells the current week's report from completed interventions, note and collaborator included", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta, Maria è di ottimo umore");

    const report = store.currentReport("a-maria");

    // The seed accompaniment (completed two days ago by Sara) opens the week.
    expect(report.entries.map((e) => e.requestId)).toEqual(["r-seed-3", request.id]);
    const fresh = report.entries.at(-1);
    expect(fresh).toMatchObject({
      service: "groceries",
      collaboratorName: "Luca Bettoni",
      note: "Spesa fatta, Maria è di ottimo umore",
    });
  });

  it("stamps the completion date, landing the intervention in today's report", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-franca");
    store.completeRequest(request.id, "Pacco ritirato e consegnato");

    const report = store.currentReport("a-ercole");

    // The seed may already put an Ercole intervention in the window; check the fresh one.
    const fresh = report.entries.find((e) => e.requestId === request.id);
    expect(fresh?.date).toBe(report.to);
  });

  it("keeps other recipients' interventions out of the report", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "family",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Tutto bene");

    const report = store.currentReport("a-giovanni");

    expect(report.entries).toHaveLength(0);
  });

  it("leaves still-open interventions out of the report", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-giovanni",
      service: "medications",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-sara");

    const report = store.currentReport("a-giovanni");

    expect(report.entries).toHaveLength(0);
  });

  it("leaves interventions older than the seven-day window out of the report", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({
        role: "family",
        requests: [
          {
            id: "r-old",
            recipientId: "a-maria",
            service: "groceries",
            channel: "phone",
            dueDate: "2026-01-01",
            notes: "",
            status: "completed",
            assigneeId: "c-luca",
            completionNote: "Una spesa di sei mesi fa",
            completedAt: "2026-01-01",
          },
        ],
        collaborators: seedCollaborators(),
        planByRecipient: SAVED_PLANS,
        teamByFamily: seedTeams(),
      }),
    );
    const store = createStore(storage);

    const report = store.currentReport("a-maria");

    expect(store.getState().requests.some((r) => r.id === "r-old")).toBe(true);
    expect(report.entries).toHaveLength(0);
  });

  it("covers a seven-day window ending today", () => {
    const store = createStore(inMemoryStorage());

    const report = store.currentReport("a-maria");

    expect(report.from < report.to).toBe(true);
    const from = new Date(`${report.from}T00:00:00`);
    const to = new Date(`${report.to}T00:00:00`);
    // Rounded: a DST change inside the window shifts the difference by up to an hour.
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(6);
  });

  it("falls back to the seed when saved state predates collaborators", () => {
    const storage = inMemoryStorage();
    storage.setItem("valcura:state", JSON.stringify({ role: "family", requests: [] }));

    const store = createStore(storage);

    expect(store.getState().collaborators.length).toBeGreaterThan(0);
  });

  it("notifies listeners when a request is created", () => {
    const store = createStore(inMemoryStorage());
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.createRequest({
      recipientId: "a-pierina",
      service: "accompaniment",
      channel: "phone",
      dueDate: "2026-07-14",
      notes: "",
    });

    expect(notifications).toBe(1);
  });

  it("notifies listeners on role change, but not after unsubscribing", () => {
    const store = createStore(inMemoryStorage());
    let notifications = 0;
    const unsubscribe = store.subscribe(() => notifications++);

    store.setRole("collaborator");
    unsubscribe();
    store.setRole("family");

    expect(notifications).toBe(1);
  });

  it("seeds every client with a plan, spreading the whole catalog across them", () => {
    const store = createStore(inMemoryStorage());

    const planIds = ["a-maria", "a-giovanni", "a-pierina", "a-ercole"].map(
      (id) => store.planFor(id).id,
    );

    expect(planIds).toContain("basic");
    expect(planIds).toContain("premium");
    expect(planIds).toContain("family-care");
  });

  it("seeds every care recipient with a family member, a plan and a report to browse", () => {
    const store = createStore(inMemoryStorage());

    for (const recipient of CARE_RECIPIENTS) {
      expect(FAMILY_MEMBERS.some((m) => m.recipientId === recipient.id)).toBe(true);
      expect(store.planFor(recipient.id).monthlyInterventions).toBeGreaterThan(0);
      expect(PAST_REPORTS.some((p) => p.recipientId === recipient.id)).toBe(true);
    }
  });

  it("describes each plan on the two commercial axes: volume and report", () => {
    const store = createStore(inMemoryStorage());

    const basic = store.planFor("a-pierina");
    const premium = store.planFor("a-maria");
    const familyCare = store.planFor("a-giovanni");

    expect(basic.reportFrequency).toBe("monthly");
    expect(premium.reportFrequency).toBe("weekly");
    expect(familyCare.reportFrequency).toBe("weekly");
    expect(familyCare.includesCall).toBe(true);
    expect(basic.monthlyInterventions).toBeLessThan(premium.monthlyInterventions);
    expect(premium.monthlyInterventions).toBeLessThan(familyCare.monthlyInterventions);
  });

  it("changes a client's plan with immediate effect", () => {
    const store = createStore(inMemoryStorage());

    store.changePlan("a-maria", "family-care");

    expect(store.planFor("a-maria").id).toBe("family-care");
  });

  it("keeps a plan change across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    createStore(storage).changePlan("a-pierina", "premium");

    expect(createStore(storage).planFor("a-pierina").id).toBe("premium");
  });

  it("restores the seed plans on reset", () => {
    const store = createStore(inMemoryStorage());
    const seeded = store.planFor("a-maria").id;
    store.changePlan("a-maria", seeded === "basic" ? "premium" : "basic");

    store.resetDemo();

    expect(store.planFor("a-maria").id).toBe(seeded);
  });

  it("refuses to change the plan of an unknown client", () => {
    const store = createStore(inMemoryStorage());

    expect(() => store.changePlan("a-nobody", "premium")).toThrow();
  });

  it("notifies listeners when a plan changes", () => {
    const store = createStore(inMemoryStorage());
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.changePlan("a-ercole", "premium");

    expect(notifications).toBe(1);
  });

  it("falls back to the seed when saved state predates plans", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({ role: "family", requests: [], collaborators: [] }),
    );

    const store = createStore(storage);

    expect(store.getState().role).toBe("coordinator");
    expect(store.planFor("a-maria").monthlyInterventions).toBeGreaterThan(0);
  });

  it("seeds every family with a care team of existing collaborators", () => {
    const store = createStore(inMemoryStorage());
    const collaboratorIds = store.getState().collaborators.map((c) => c.id);

    for (const member of FAMILY_MEMBERS) {
      const team = store.careTeamFor(member.id);
      expect(collaboratorIds).toContain(team.primaryId);
      expect(team.backupIds.length).toBeGreaterThanOrEqual(1);
      expect(team.backupIds.length).toBeLessThanOrEqual(2);
      for (const backupId of team.backupIds) {
        expect(collaboratorIds).toContain(backupId);
        expect(backupId).not.toBe(team.primaryId);
      }
    }
  });

  it("refuses to tell the care team of an unknown family", () => {
    const store = createStore(inMemoryStorage());

    expect(() => store.careTeamFor("f-nobody")).toThrow();
  });

  it("reconfigures a family's care team with immediate effect on the suggestions", () => {
    const store = createStore(inMemoryStorage());

    store.setCareTeam("f-anna", { primaryId: "c-sara", backupIds: ["c-luca", "c-franca"] });

    expect(store.careTeamFor("f-anna")).toEqual({
      primaryId: "c-sara",
      backupIds: ["c-luca", "c-franca"],
    });
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: "2026-07-12",
      notes: "",
    });
    const suggestions = store.suggestCollaborators(request.id);
    expect(suggestions[0].collaborator.id).toBe("c-sara");
    expect(suggestions[0].teamRole).toBe("primary");
  });

  it("refuses an invalid care team, keeping the configured one", () => {
    const store = createStore(inMemoryStorage());
    const seeded = store.careTeamFor("f-anna");

    // Three backups, unknown members, overlaps and unknown family are all rejected.
    expect(() =>
      store.setCareTeam("f-anna", {
        primaryId: "c-sara",
        backupIds: ["c-luca", "c-franca", "c-omar"],
      }),
    ).toThrow();
    expect(() =>
      store.setCareTeam("f-anna", { primaryId: "c-nobody", backupIds: [] }),
    ).toThrow();
    expect(() =>
      store.setCareTeam("f-anna", { primaryId: "c-sara", backupIds: ["c-nobody"] }),
    ).toThrow();
    expect(() =>
      store.setCareTeam("f-anna", { primaryId: "c-sara", backupIds: ["c-sara"] }),
    ).toThrow();
    expect(() =>
      store.setCareTeam("f-anna", { primaryId: "c-sara", backupIds: ["c-luca", "c-luca"] }),
    ).toThrow();
    expect(() =>
      store.setCareTeam("f-nobody", { primaryId: "c-sara", backupIds: [] }),
    ).toThrow();

    expect(store.careTeamFor("f-anna")).toEqual(seeded);
  });

  it("keeps a care team change across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    createStore(storage).setCareTeam("f-elio", { primaryId: "c-franca", backupIds: ["c-omar"] });

    expect(createStore(storage).careTeamFor("f-elio")).toEqual({
      primaryId: "c-franca",
      backupIds: ["c-omar"],
    });
  });

  it("restores the seed care teams on reset", () => {
    const store = createStore(inMemoryStorage());
    const seeded = store.careTeamFor("f-carla");
    store.setCareTeam("f-carla", { primaryId: "c-sara", backupIds: [] });

    store.resetDemo();

    expect(store.careTeamFor("f-carla")).toEqual(seeded);
  });

  it("notifies listeners when a care team changes", () => {
    const store = createStore(inMemoryStorage());
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.setCareTeam("f-marco", { primaryId: "c-sara", backupIds: ["c-omar"] });

    expect(notifications).toBe(1);
  });

  it("falls back to the seed when saved state predates care teams", () => {
    const storage = inMemoryStorage();
    storage.setItem(
      "valcura:state",
      JSON.stringify({
        role: "family",
        requests: [],
        collaborators: seedCollaborators(),
        planByRecipient: SAVED_PLANS,
      }),
    );

    const store = createStore(storage);

    expect(store.getState().role).toBe("coordinator");
    expect(store.careTeamFor("f-anna").primaryId).toBeTypeOf("string");
  });

  it("counts a booking due this month against the client's monthly usage", () => {
    const store = createStore(inMemoryStorage());
    const before = store.monthlyUsage("a-maria");

    store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: localToday(),
      notes: "",
    });

    expect(store.monthlyUsage("a-maria")).toBe(before + 1);
  });

  it("keeps counting the intervention through assignment and completion", () => {
    const store = createStore(inMemoryStorage());
    const before = store.monthlyUsage("a-maria");
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: localToday(),
      notes: "",
    });

    store.assignRequest(request.id, "c-luca");
    store.completeRequest(request.id, "Spesa fatta");

    expect(store.monthlyUsage("a-maria")).toBe(before + 1);
  });

  it("leaves bookings from other months out of the monthly usage", () => {
    const store = createStore(inMemoryStorage());
    const before = store.monthlyUsage("a-maria");

    store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      channel: "phone",
      dueDate: localDaysFromToday(-40),
      notes: "",
    });

    expect(store.monthlyUsage("a-maria")).toBe(before);
  });

  it("keeps other clients' bookings out of a client's usage", () => {
    const store = createStore(inMemoryStorage());
    const before = store.monthlyUsage("a-maria");

    store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: localToday(),
      notes: "",
    });

    expect(store.monthlyUsage("a-maria")).toBe(before);
  });

  describe("report window by plan", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 18, 10));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("tells a weekly report for a Premium family: seven days ending today", () => {
      const store = createStore(inMemoryStorage());

      const report = store.currentReport("a-maria");

      expect(report.frequency).toBe("weekly");
      expect(report.from).toBe("2026-07-12");
      expect(report.to).toBe("2026-07-18");
    });

    it("tells a monthly report for a Basic family: the month so far", () => {
      const store = createStore(inMemoryStorage());

      const report = store.currentReport("a-pierina");

      expect(report.frequency).toBe("monthly");
      expect(report.from).toBe("2026-07-01");
      expect(report.to).toBe("2026-07-18");
    });

    it("keeps interventions from earlier in the month in a Basic family's report", () => {
      vi.setSystemTime(new Date(2026, 6, 3, 10));
      const store = createStore(inMemoryStorage());
      const request = store.createRequest({
        recipientId: "a-pierina",
        service: "groceries",
        channel: "phone",
        dueDate: "2026-07-03",
        notes: "",
      });
      store.assignRequest(request.id, "c-omar");
      store.completeRequest(request.id, "Spesa consegnata, tutto bene");

      vi.setSystemTime(new Date(2026, 6, 18, 10));
      const report = store.currentReport("a-pierina");

      expect(report.entries.map((e) => e.requestId)).toContain(request.id);
    });

    it("drops those older interventions once the family moves to a weekly plan", () => {
      vi.setSystemTime(new Date(2026, 6, 3, 10));
      const store = createStore(inMemoryStorage());
      const request = store.createRequest({
        recipientId: "a-pierina",
        service: "groceries",
        channel: "phone",
        dueDate: "2026-07-03",
        notes: "",
      });
      store.assignRequest(request.id, "c-omar");
      store.completeRequest(request.id, "Spesa consegnata, tutto bene");
      vi.setSystemTime(new Date(2026, 6, 18, 10));

      store.changePlan("a-pierina", "premium");

      const report = store.currentReport("a-pierina");
      expect(report.frequency).toBe("weekly");
      expect(report.entries.map((e) => e.requestId)).not.toContain(request.id);
    });

    it("turns the report monthly the moment the client moves to Basic", () => {
      const store = createStore(inMemoryStorage());
      expect(store.currentReport("a-maria").frequency).toBe("weekly");

      store.changePlan("a-maria", "basic");

      const report = store.currentReport("a-maria");
      expect(report.frequency).toBe("monthly");
      expect(report.from).toBe("2026-07-01");
    });
  });
});
