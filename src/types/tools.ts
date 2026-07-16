// src/tools/types.ts
export interface Tool {
    /** Le nom que le modèle utilisera pour l'appeler. */
    name: string;
    /** La description : c'est la SEULE doc que voit le modèle. */
    description: string;
    /** Le schéma JSON des paramètres attendus. */
    parameters: Record<string, unknown>;
    /** La fonction réellement exécutée. */
    run: (args: Record<string, any>) => Promise<string> | string;
}