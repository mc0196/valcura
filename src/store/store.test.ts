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
