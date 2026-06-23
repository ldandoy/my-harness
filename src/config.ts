// Le modèle Ollama qu'on utilise (surchargeable par variable d'env).
export const MODEL = process.env.MY_HARNESS_MODEL ?? "qwen2.5";

// Où écoute le serveur Ollama local.
export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

// Garde-fou : on arrêtera la boucle après ce nombre de tours (utile en vidéo 2).
export const MAX_TOURS = process.env.MAX_TOURS ?? 15;

// Le mode d'emploi de l'agent (on l'étoffera avec les outils).
export const SYSTEME = process.env.SYSTEME ??
    "Tu es un assistant qui travaille dans un terminal. " +
    "Réponds de façon concise et en français.";