import 'dotenv/config';

export const DEBUG = process.env.DEBUG === "true";

// Le modèle Ollama qu'on utilise (surchargeable par variable d'env).
export let MODEL = process.env.MY_HARNESS_MODEL ?? "qwen2.5";

export function setHost(u: string): void { HOST = u; }

// Garde-fou : on arrêtera la boucle après ce nombre de tours (utile en vidéo 2).
export const MAX_TOURS = process.env.MAX_TOURS ?? 15;

// Plafond de la fenêtre de contexte demandée à Ollama. Un modèle annonce souvent
// beaucoup plus (32k, 128k…) que ce qu'on veut réellement charger en mémoire.
export const CTX_MAX = Number(process.env.MY_HARNESS_CTX_MAX ?? 8192);

// Le mode d'emploi de l'agent (on l'étoffera avec les outils).
export const SYSTEME = process.env.SYSTEME ??
    "Tu es un assistant qui travaille dans un terminal. " +
    "Réponds de façon concise et en français.";

// Temps max d'une commande, en millisecondes.
export const TIMEOUT_MS = 30_000;

export function setModel(m: string): void { MODEL = m; }

export function normaliserUrl(v: string): string {
    return /^https?:\/\//i.test(v) ? v : `http://${v}`;
}

export const OLLAMA_HOST = normaliserUrl(process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434");

// URL réellement utilisée pour les requêtes : /connect la fait varier.
export let HOST = OLLAMA_HOST;