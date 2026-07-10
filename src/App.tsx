import { useSyncExternalStore } from "react";
import { ROLES, type Role, type ValCuraStore } from "./store/store";
import { CoordinatorView } from "./views/CoordinatorView";
import "./App.css";

// UI copy stays in Italian: the demo is pitched to the founding partners.
const LABELS: Record<Role, string> = {
  coordinator: "Coordinatore",
  collaborator: "Collaboratore",
  family: "Famiglia",
  admin: "Admin",
};

const DESCRIPTIONS: Record<Exclude<Role, "coordinator">, string> = {
  collaborator: "Qui il collaboratore vedrà i propri incarichi e il tetto annuo dei compensi.",
  family: "Qui la famiglia vedrà i servizi attivi per il proprio caro e il report periodico.",
  admin: "Qui l'admin vedrà abbonamenti, collaboratori e impostazioni della piattaforma.",
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
          <CoordinatorView store={store} requests={state.requests} />
        ) : (
          <>
            <h2>Vista {LABELS[state.role]}</h2>
            <p>{DESCRIPTIONS[state.role]}</p>
          </>
        )}
      </main>
    </div>
  );
}
