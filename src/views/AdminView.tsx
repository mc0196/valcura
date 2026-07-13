import { PLANS, type Collaborator, type PlanId, type ValCuraStore } from "../store/store";
import { CARE_RECIPIENTS, FAMILY_MEMBERS } from "../store/seed";
import { formatPlanReport, usageLabel } from "./format";

/** The family's primary and backup pickers; duplicates are filtered, not offered. */
function CareTeamEditor({
  store,
  familyId,
  collaborators,
}: {
  store: ValCuraStore;
  familyId: string;
  collaborators: Collaborator[];
}) {
  const team = store.careTeamFor(familyId);
  const backupAt = (slot: number): string => team.backupIds[slot] ?? "";

  function apply(primaryId: string, backupIds: string[]) {
    store.setCareTeam(familyId, {
      primaryId,
      backupIds: [...new Set(backupIds.filter((id) => id !== "" && id !== primaryId))],
    });
  }

  return (
    <div className="care-team">
      <span className="care-team-caption">Collaboratori di fiducia</span>
      <label className="team-picker">
        Primario
        <select
          value={team.primaryId}
          onChange={(e) => apply(e.target.value, team.backupIds)}
        >
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {[0, 1].map((slot) => (
        <label key={slot} className="team-picker">
          Backup {slot + 1}
          <select
            value={backupAt(slot)}
            onChange={(e) => {
              const next = [backupAt(0), backupAt(1)];
              next[slot] = e.target.value;
              apply(team.primaryId, next);
            }}
          >
            <option value="">Nessuno</option>
            {collaborators
              .filter((c) => c.id !== team.primaryId && c.id !== backupAt(1 - slot))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export function AdminView({
  store,
  collaborators,
}: {
  store: ValCuraStore;
  collaborators: Collaborator[];
}) {
  return (
    <div className="admin">
      <section aria-labelledby="clients-title">
        <h2 id="clients-title">Clienti</h2>
        <ul className="clients">
          {CARE_RECIPIENTS.map((recipient) => {
            const family = FAMILY_MEMBERS.find((m) => m.recipientId === recipient.id);
            const plan = store.planFor(recipient.id);
            const used = store.monthlyUsage(recipient.id);
            const overPlan = used > plan.monthlyInterventions;
            return (
              <li key={recipient.id} className="client-card">
                <div className="client-head">
                  <div>
                    <strong>{recipient.name}</strong>
                    <div className="client-meta">
                      {recipient.zone}
                      {family !== undefined && (
                        <>
                          {" "}
                          · famiglia: {family.name} ({family.city})
                        </>
                      )}
                    </div>
                  </div>
                  <label className="plan-picker">
                    Piano
                    <select
                      value={plan.id}
                      onChange={(e) => store.changePlan(recipient.id, e.target.value as PlanId)}
                    >
                      {PLANS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {family !== undefined && (
                  <CareTeamEditor store={store} familyId={family.id} collaborators={collaborators} />
                )}
                <div className="usage">
                  <div
                    className="usage-bar"
                    role="meter"
                    aria-valuenow={used}
                    aria-valuemin={0}
                    aria-valuemax={plan.monthlyInterventions}
                    aria-label="Consumo interventi del mese"
                  >
                    <div
                      className={overPlan ? "usage-fill over" : "usage-fill"}
                      style={{ width: `${Math.min(100, (used / plan.monthlyInterventions) * 100)}%` }}
                    />
                  </div>
                  <span className="usage-label">
                    {usageLabel(used, plan.monthlyInterventions)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="plans-title">
        <h2 id="plans-title">I piani a confronto</h2>
        <table className="plans-table">
          <thead>
            <tr>
              <td />
              {PLANS.map((plan) => (
                <th key={plan.id} scope="col">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Interventi inclusi al mese</th>
              {PLANS.map((plan) => (
                <td key={plan.id}>{plan.monthlyInterventions}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Report alla famiglia</th>
              {PLANS.map((plan) => (
                <td key={plan.id}>{formatPlanReport(plan)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
