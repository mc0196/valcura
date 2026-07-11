import { useState, type FormEvent } from "react";
import type { Collaborator, ServiceRequest, ValCuraStore } from "../store/store";
import { SERVICE_LABELS, formatDate, localToday, recipientName } from "./format";

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
                </div>
                {mission.completionNote !== undefined && (
                  <p className="completion-note">“{mission.completionNote}”</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
