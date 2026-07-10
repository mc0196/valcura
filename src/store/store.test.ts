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
