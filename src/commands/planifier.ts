import { lancerAgent } from "../agent";
import type { AgentCallbacks, SousAgent } from "../types";
import { log } from "../logger";

function parserPlan(brut: string): SousAgent[] {
    try {
        const json = brut.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
        return JSON.parse(json);
    } catch { return []; }
}

export async function commandePlanifier(
    issuePath: string,
    cb: AgentCallbacks
): Promise<void> {
    // Étape 1 — agent planificateur : lit l'issue, génère le plan
    let planBrut = "";
    await lancerAgent(
        `Lis le fichier "${issuePath}".
Génère un plan JSON — un tableau d'agents à lancer :
[
  { "tache": "description courte", "prompt": "Tu es un agent spécialisé en... Ta mission : ..." }
]
Réponds UNIQUEMENT avec le JSON.`,
        { ...cb, onResponse: t => { planBrut = t; } }
    );
    log(`commandePlanifier() — plan brut : ${planBrut}`);
    const plan = parserPlan(planBrut);
    if (plan.length === 0) {
        cb.onResponse?.("Impossible de parser le plan."); return;
    }
    cb.onResponse?.(`Plan : ${plan.length} agents à lancer en parallèle.`);

    // Étape 3 — sous-agents spécialisés en parallèle
    await Promise.all(
        plan.map(t =>
            // Pas de streaming ici : N agents en parallèle entrelaceraient
            // leurs fragments dans la même ligne. On garde les réponses
            // complètes, affichées d'un bloc à la fin de chaque sous-agent.
            lancerAgent(t.tache, { ...cb, onChunk: undefined, systemPrompt: t.prompt })
        )
    );

    cb.onResponse?.("✅ Tous les agents ont terminé.");
}