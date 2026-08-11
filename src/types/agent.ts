export type ConfirmChoice = "once" | "always" | "never";

export type AgentCallbacks = {
    onTour?: (n: number) => void;
    onTool?: (name: string, args: Record<string, unknown>) => void;
    // Appelé à chaque fragment reçu du modèle (streaming), au fil de l'eau.
    onChunk?: (delta: string) => void;
    // Toujours appelé une fois, avec le texte complet : les consommateurs qui
    // ignorent onChunk (compaction, /planifier) gardent le même comportement.
    onResponse?: (text: string) => void;
    onConfirm?: (prog: string) => Promise<ConfirmChoice>;
    systemPrompt?: string;
    onTokens?: (prompt: number, response: number, max: number) => void;
};

export type SousAgent = {  // ← NOUVEAU : structure du plan généré par le LLM
    tache: string;
    prompt: string;
};