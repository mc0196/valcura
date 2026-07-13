import { useState, type FormEvent } from "react";
import type { Collaborator, ServiceRequest, ValCuraStore } from "../store/store";
import {
  SERVICE_LABELS,
  formatDate,
  formatEuro,
  formatRanking,
  formatStars,
  localMonthStart,
  localToday,
  recipientName,
} from "./format";

function thanksLabel(thanksCount: number): string {
  if (thanksCount === 0) return "ancora nessun ringraziamento";
  return thanksCount === 1 ? "1 famiglia ti ringrazia" : `${thanksCount} famiglie ti ringraziano`;
}

function monthMissionsLabel(totalMissions: number): string {
  if (totalMissions === 0) return "Nessuna missione completata questo mese, per ora";
  return totalMissions === 1
    ? "1 missione completata questo mese"
    : `${totalMissions} missioni completate questo mese`;
}

export function CollaboratorView({
  store,
  requests,
  collaborators,
}: {
  store: ValCuraStore;
  requests: ServiceRequest[];
  collaborators: Collaborator[];
}) {
  const [collaboratorId, setCollaboratorId] = useState(collaborators[0]?.id ?? "");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const today = localToday();
  const me = collaborators.find((c) => c.id === collaboratorId);
  const monthEarnings = store.compensationSummary(localMonthStart(), today, collaboratorId);
  const mine = requests.filter((r) => r.assigneeId === collaboratorId);
  const missions = mine
    .filter((r) => r.status === "assigned")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completed = mine.filter((r) => r.status === "completed");

  function handleComplete(event: FormEvent<HTMLFormElement>, requestId: string) {
    event.preventDefault();
    if (note.trim() === "") return;
    store.completeRequest(requestId, note);
    setCompletingId(null);
    setNote("");
  }

  return (
    <div className="collaborator">
      <label className="impersonation">
        Stai impersonando
        <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)}>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {me !== undefined && (
        <section aria-labelledby="recognition-title">
          <h2 id="recognition-title">I tuoi riconoscimenti</h2>
          <div className="recognition">
            <span className="recognition-ranking">★ {formatRanking(me.ranking)}</span>
            <span className="recognition-meta">
              media di {me.ratingsCount} valutazioni · {thanksLabel(me.thanksCount)}
            </span>
          </div>
        </section>
      )}

      <section aria-labelledby="earnings-title">
        <h2 id="earnings-title">Il tuo compenso del mese</h2>
        <div className="recognition earnings">
          <span className="recognition-ranking">{formatEuro(monthEarnings.totalFees)}</span>
          <span className="recognition-meta">{monthMissionsLabel(monthEarnings.totalMissions)}</span>
        </div>
      </section>

      <section aria-labelledby="missions-title">
        <h2 id="missions-title">Le mie missioni</h2>
        {missions.length === 0 ? (
          <p>Nessuna missione assegnata al momento. Goditi la valle!</p>
        ) : (
          <ul className="queue">
            {missions.map((mission) => (
              <li key={mission.id} className="request-card mission">
                <div className="request-head">
                  <strong>{recipientName(mission.recipientId)}</strong>
                  {mission.dueDate === today && <span className="badge today">oggi</span>}
                </div>
                <div className="request-meta">
                  {SERVICE_LABELS[mission.service]} · {formatDate(mission.dueDate)}
                </div>
                {mission.notes !== "" && <p className="request-notes">{mission.notes}</p>}
                {completingId === mission.id ? (
                  <form className="complete-form" onSubmit={(e) => handleComplete(e, mission.id)}>
                    <label>
                      Nota di chiusura
                      <textarea
                        rows={3}
                        required
                        autoFocus
                        placeholder="Es. la sig.ra Maria sta bene, due chiacchiere in cucina…"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                    <div className="complete-actions">
                      <button type="submit" className="confirm">
                        Conferma
                      </button>
                      <button type="button" className="cancel" onClick={() => setCompletingId(null)}>
                        Annulla
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="done"
                    onClick={() => {
                      setCompletingId(mission.id);
                      setNote("");
                    }}
                  >
                    Fatto ✓
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 && (
        <section aria-labelledby="completed-title">
          <h2 id="completed-title">Completate</h2>
          <ul className="queue">
            {completed.map((mission) => (
              <li key={mission.id} className="request-card mission-completed">
                <div className="request-head">
                  <strong>{recipientName(mission.recipientId)}</strong>
                  <span className="badge completed">completata</span>
                </div>
                <div className="request-meta">
                  {SERVICE_LABELS[mission.service]} · {formatDate(mission.dueDate)}
                  {mission.fee !== undefined && <> · compenso {formatEuro(mission.fee)}</>}
                </div>
                {mission.completionNote !== undefined && (
                  <p className="completion-note">“{mission.completionNote}”</p>
                )}
                {mission.review !== undefined && (
                  <div className="review">
                    <span className="review-stars" aria-label={`${mission.review.rating} su 5`}>
                      {formatStars(mission.review.rating)}
                    </span>{" "}
                    La famiglia ti ha valutato
                    {mission.review.thanks !== undefined && (
                      <p className="review-thanks">“{mission.review.thanks}”</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
