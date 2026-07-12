import { useSyncExternalStore } from "react";
import { ROLES, type Role, type ValCuraStore } from "./store/store";
import { CoordinatorView } from "./views/CoordinatorView";
import { CollaboratorView } from "./views/CollaboratorView";
import { FamilyView } from "./views/FamilyView";
import { AdminView } from "./views/AdminView";
import "./App.css";

// UI copy stays in Italian: the demo is pitched to the founding partners.
const LABELS: Record<Role, string> = {
  coordinator: "Coordinatore",
  collaborator: "Collaboratore",
  family: "Famiglia",
  admin: "Admin",
};

export function App({ store }: { store: ValCuraStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">ValCura</h1>
        <nav className="role-switcher" aria-label="Selettore ruolo">
          {ROLES.map((role) => (
            <button
              key={role}
              className={role === state.role ? "role active" : "role"}
              aria-pressed={role === state.role}
              onClick={() => store.setRole(role)}
            >
              {LABELS[role]}
            </button>
          ))}
        </nav>
        <button className="reset" onClick={() => store.resetDemo()}>
          Reset demo
        </button>
      </header>
      <main className="view">
        {state.role === "coordinator" ? (
          <CoordinatorView
            store={store}
            requests={state.requests}
            collaborators={state.collaborators}
          />
        ) : state.role === "collaborator" ? (
          <CollaboratorView
            store={store}
            requests={state.requests}
            collaborators={state.collaborators}
          />
        ) : state.role === "family" ? (
          <FamilyView store={store} requests={state.requests} collaborators={state.collaborators} />
        ) : (
          <AdminView store={store} />
        )}
      </main>
    </div>
  );
}
