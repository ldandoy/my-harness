import type { Tool } from "../types";
import { demanderAvis } from "./ask";

export const askUser: Tool = {
    name: "ask_user",
    description:
        "Pose une question à l'utilisateur en cours de tâche et attend sa réponse avant de " +
        "continuer. À utiliser quand il y a une vraie décision à prendre, une ambiguïté à " +
        "lever, ou plusieurs approches possibles à proposer — pas pour des détails que tu " +
        "peux déduire toi-même du code ou du contexte.",
    parameters: {
        type: "object",
        properties: {
            question: { type: "string", description: "La question à poser, claire et autonome." },
            choix: {
                type: "array",
                items: { type: "string" },
                description:
                    "Optionnel : options proposées (ex: plusieurs approches possibles). " +
                    "Si absent, l'utilisateur répond librement en texte.",
            },
        },
        required: ["question"],
    },
    async run(args) {
        return await demanderAvis(args.question, args.choix);
    },
};
