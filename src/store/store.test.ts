import { describe, expect, it } from "vitest";
import { createStore, type Storage } from "./store";

/** In-memory storage: stands in for localStorage in tests (external boundary). */
function inMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

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
      dueDate: "2026-07-12",
      notes: "Citofonare due volte",
    });

    const [first] = store.getState().requests;
    expect(first).toEqual(created);
    expect(first.status).toBe("new");
    expect(first).toMatchObject({
      recipientId: "a-maria",
      service: "groceries",
      dueDate: "2026-07-12",
      notes: "Citofonare due volte",
    });
  });

  it("keeps a created request across a reload (new store on the same storage)", () => {
    const storage = inMemoryStorage();
    const created = createStore(storage).createRequest({
      recipientId: "a-ercole",
      service: "errand",
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

  it("suggests the seed collaborators for a new request, with zone, availability, load and ranking", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
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
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(request.id);

    // Omar covers Pierina's own zone and outranks everyone available, but is off today.
    expect(suggestions.at(-1)?.collaborator.id).toBe("c-omar");
  });

  it("prefers collaborators covering the recipient's zone among the available ones", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      dueDate: "2026-07-12",
      notes: "",
    });

    const ids = store.suggestCollaborators(request.id).map((s) => s.collaborator.id);

    // Sara has the best ranking but is up-valley; Maria's zone comes first.
    expect(ids.indexOf("c-sara")).toBeGreaterThan(ids.indexOf("c-luca"));
    expect(ids.indexOf("c-sara")).toBeGreaterThan(ids.indexOf("c-franca"));
  });

  it("breaks ties between equally placed collaborators by higher ranking", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      dueDate: "2026-07-12",
      notes: "",
    });

    const ids = store.suggestCollaborators(request.id).map((s) => s.collaborator.id);

    // Luca and Franca both cover Maria's zone, are free and unloaded; Luca ranks 4.7 vs 4.5.
    expect(ids.indexOf("c-luca")).toBeLessThan(ids.indexOf("c-franca"));
  });

  it("assigns a new request to the chosen collaborator, moving it to \"assigned\"", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
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
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-luca");

    expect(() => store.assignRequest(request.id, "c-franca")).toThrow();

    const assigned = store.getState().requests.find((r) => r.id === request.id);
    expect(assigned?.assigneeId).toBe("c-luca");
  });

  it("prefers a lighter load: a fresh assignment pushes the collaborator down next time", () => {
    const store = createStore(inMemoryStorage());
    const first = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    const second = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
      dueDate: "2026-07-12",
      notes: "",
    });

    const suggestions = store.suggestCollaborators(second.id);

    // Luca outranks Franca in the same zone, but now carries an open assignment.
    const ids = suggestions.map((s) => s.collaborator.id);
    expect(ids.indexOf("c-franca")).toBeLessThan(ids.indexOf("c-luca"));
    expect(suggestions.find((s) => s.collaborator.id === "c-luca")?.load).toBe(1);
  });

  it("refuses to assign to an unknown collaborator, leaving the request new", () => {
    const store = createStore(inMemoryStorage());
    const request = store.createRequest({
      recipientId: "a-maria",
      service: "groceries",
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
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(first.id, "c-luca");
    store.completeRequest(first.id, "Spesa fatta, tutto bene");
    const second = store.createRequest({
      recipientId: "a-ercole",
      service: "errand",
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
      dueDate: "2026-07-12",
      notes: "",
    });
    store.assignRequest(request.id, "c-omar");
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.completeRequest(request.id, "Spesa consegnata alla sig.ra Pierina");

    expect(notifications).toBe(1);
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
});
