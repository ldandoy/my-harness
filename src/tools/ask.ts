// Pont entre l'outil ask_user et l'UI qui l'affiche — même principe que
// setOnConfirm dans garde-fou.ts : l'outil ne connaît pas l'UI, il appelle
// juste cette fonction et attend la réponse de l'utilisateur.
export type OnAskUser = (question: string, choix?: string[]) => Promise<string>;

let _onAskUser: OnAskUser | undefined;

export function setOnAskUser(fn?: OnAskUser): void {
    _onAskUser = fn;
}

export async function demanderAvis(question: string, choix?: string[]): Promise<string> {
    if (!_onAskUser) throw new Error("Aucune interface pour poser la question à l'utilisateur.");
    return _onAskUser(question, choix);
}
