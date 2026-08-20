// Registre central des commandes slash.
// Sert à la fois à l'autocomplétion (UI) et au contrôle des arguments.

export type Commande = {
    nom: string;          // "/models"
    description: string;
    arg?: string;         // argument attendu, affiché dans la palette
    argRequis?: boolean;  // si vrai, valider sans argument affiche l'usage
};

export const COMMANDES: Commande[] = [
    { nom: "/models", description: "Choisir le modèle du serveur actif" },
    { nom: "/connect", description: "Changer de serveur LLM", arg: "nom|url" },
    { nom: "/init", description: "Analyser le projet et générer MYHARNESS.md" },
    { nom: "/clear", description: "Réinitialiser le contexte de la session" },
    { nom: "/diff", description: "Voir le diff d'une écriture de fichier (le dernier par défaut)", arg: "id" },
    { nom: "/save", description: "Sauvegarder la session en cours" },
    { nom: "/save-clear", description: "Sauvegarder puis réinitialiser la session" },
    { nom: "/resume", description: "Lister ou reprendre une session sauvegardée", arg: "id" },
    { nom: "/exit", description: "Quitter my-harness" },
    { nom: "/planifier", description: "Découper une issue en sous-agents", arg: "fichier", argRequis: true },
    { nom: "/remember", description: "Mémoriser une information", arg: "texte", argRequis: true },
];

// Commandes dont le nom commence par ce qui est saisi.
// Dès qu'un espace est tapé, l'utilisateur écrit l'argument : on referme la liste.
export function filtrerCommandes(saisie: string): Commande[] {
    if (!saisie.startsWith("/") || saisie.includes(" ")) return [];
    return COMMANDES.filter(c => c.nom.startsWith(saisie));
}

// Texte inséré par la complétion. Les commandes à argument gagnent une espace
// finale, pour que le curseur soit prêt à saisir l'argument.
export function completion(c: Commande): string {
    return c.arg ? `${c.nom} ` : c.nom;
}

// Retrouve la commande correspondant à une saisie complète ("/remember ceci").
export function trouverCommande(saisie: string): Commande | undefined {
    const nom = saisie.trim().split(" ")[0];
    return COMMANDES.find(c => c.nom === nom);
}
