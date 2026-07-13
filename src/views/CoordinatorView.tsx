import { useState, type FormEvent } from "react";
import {
  SERVICE_TYPES,
  type Collaborator,
  type CollaboratorSuggestion,
  type ServiceRequest,
  type ServiceType,
  type ValCuraStore,
} from "../store/store";
import { CARE_RECIPIENTS } from "../store/seed";
import { missionFee, missionTier } from "../store/compensation";
import {
  CHANNEL_LABELS,
  SERVICE_LABELS,
  STATUS_LABELS,
  TIER_LABELS,
  formatDate,
  formatEuro,
  formatRanking,
  localToday,
  recipientName,
  usageLabel,
} from "./format";

function loadLabel(load: number): string {
  if (load === 0) return "nessun incarico aperto";
  return load === 1 ? "1 incarico aperto" : `${load} incarichi aperti`;
}

function ratingsLabel(ratingsCount: number): string {
  return ratingsCount === 1 ? "1 valutazione" : `${ratingsCount} valutazioni`;
}

function thanksLabel(thanksCount: number): string {
  return thanksCount === 1 ? "1 ringraziamento" : `${thanksCount} ringraziamenti`;
}

const TEAM_ROLE_LABELS = { primary: "primario", backup: "backup" } as const;

function availabilityLabel(suggestion: CollaboratorSuggestion): string {
  if (!suggestion.collaborator.availableToday) return "non disponibile oggi";
  return suggestion.availableForRequest ? "disponibile oggi" : "già impegnato in quella data";
}

/** Continuity at a glance: whom the top suggestion belongs to, or that it broke. */
function ContinuityNote({ top }: { top: CollaboratorSuggestion | undefined }) {
  const role = top !== undefined && top.availableForRequest ? top.teamRole : undefined;
  if (role === "primary") {
    return <p className="team-note primary">Suggerito il collaboratore primario della famiglia.</p>;
  }
  if (role === "backup") {
    return (
      <p className="team-note backup">Primario non disponibile: suggerito un backup.</p>
    );
  }
  return (
    <p className="team-note manual">Né primario né backup disponibili — scegli manualmente.</p>
  );
}

export function CoordinatorView({
  store,
  requests,
  collaborators,
}: {
  store: ValCuraStore;
  requests: ServiceRequest[];
  collaborators: Collaborator[];
}) {
  const [recipientId, setRecipientId] = useState(CARE_RECIPIENTS[0].id);
  const [service, setService] = useState<ServiceType>("groceries");
  const [dueDate, setDueDate] = useState(localToday());
  const [notes, setNotes] = useState("");
  const [suggestingForId, setSuggestingForId] = useState<string | null>(null);

  const leaderboard = [...collaborators].sort((a, b) => b.ranking - a.ranking);
  const plan = store.planFor(recipientId);
  const used = store.monthlyUsage(recipientId);
  const overPlan = used > plan.monthlyInterventions;

  function collaboratorName(collaboratorId: string): string {
    return collaborators.find((c) => c.id === collaboratorId)?.name ?? "Collaboratore sconosciuto";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    store.createRequest({ recipientId, service, channel: "phone", dueDate, notes: notes.trim() });
    setNotes("");
  }

  return (
    <div className="coordinator">
      <section aria-labelledby="new-request-title">
        <h2 id="new-request-title">Nuova richiesta da telefonata</h2>
        <form className="request-form" onSubmit={handleSubmit}>
          <label>
            Assistito
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              {CARE_RECIPIENTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className={overPlan ? "plan-usage over" : "plan-usage"}>
              Piano {plan.name} · {usageLabel(used, plan.monthlyInterventions)}
            </span>
          </label>
          <label>
            Tipo di servizio
            <select value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="plan-usage">
              Missione {TIER_LABELS[missionTier(service)].toLowerCase()} · compenso{" "}
              {formatEuro(missionFee(service))}
            </span>
          </label>
          <label>
            Data desiderata
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="notes-field">
            Note
            <textarea
              rows={2}
              placeholder="Es. citofonare due volte, la lista è appesa al frigo…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button type="submit" className="primary">
            Registra richiesta
          </button>
        </form>
      </section>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title">Coda richieste</h2>
        <ul className="queue">
          {requests.map((request) => (
            <li key={request.id} className="request-card">
              <div className="request-head">
                <strong>{recipientName(request.recipientId)}</strong>
                <span className={`badge ${request.status}`}>{STATUS_LABELS[request.status]}</span>
              </div>
              <div className="request-meta">
                {SERVICE_LABELS[request.service]} · {formatDate(request.dueDate)} ·{" "}
                {CHANNEL_LABELS[request.channel]}
                {request.assigneeId !== undefined && (
                  <> · {collaboratorName(request.assigneeId)}</>
                )}
              </div>
              {request.notes !== "" && <p className="request-notes">{request.notes}</p>}
              {request.completionNote !== undefined && (
                <p className="completion-note">Nota di chiusura: “{request.completionNote}”</p>
              )}
              {request.status === "new" && (
                <button
                  className="suggest-toggle"
                  onClick={() =>
                    setSuggestingForId(suggestingForId === request.id ? null : request.id)
                  }
                >
                  {suggestingForId === request.id ? "Chiudi suggerimenti" : "Scegli collaboratore"}
                </button>
              )}
              {request.status === "new" &&
                suggestingForId === request.id &&
                (() => {
                  const suggestions = store.suggestCollaborators(request.id);
                  return (
                    <>
                      <ContinuityNote top={suggestions[0]} />
                      <ul className="suggestions">
                        {suggestions.map((suggestion) => (
                          <li key={suggestion.collaborator.id} className="suggestion">
                            <div>
                              <strong>{suggestion.collaborator.name}</strong>
                              {suggestion.teamRole !== undefined && (
                                <span className={`badge team-${suggestion.teamRole}`}>
                                  {TEAM_ROLE_LABELS[suggestion.teamRole]}
                                </span>
                              )}
                              <span className="suggestion-ranking">
                                {" "}
                                ★ {formatRanking(suggestion.collaborator.ranking)}
                              </span>
                              <div className="suggestion-meta">
                                {suggestion.collaborator.zone}
                                {suggestion.inRecipientZone && " (zona dell'assistito)"} ·{" "}
                                {availabilityLabel(suggestion)} · {loadLabel(suggestion.load)}
                              </div>
                            </div>
                            <button
                              className="primary assign"
                              onClick={() => {
                                store.assignRequest(request.id, suggestion.collaborator.id);
                                setSuggestingForId(null);
                              }}
                            >
                              Assegna
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title">Classifica collaboratori</h2>
        <ol className="leaderboard">
          {leaderboard.map((collaborator) => (
            <li key={collaborator.id} className="leaderboard-row">
              <div>
                <strong>{collaborator.name}</strong>
                <div className="leaderboard-meta">
                  {ratingsLabel(collaborator.ratingsCount)} ·{" "}
                  {thanksLabel(collaborator.thanksCount)}
                </div>
              </div>
              <span className="leaderboard-ranking">★ {formatRanking(collaborator.ranking)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
