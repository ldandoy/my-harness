// Persistance des sessions : /save écrit le tableau de messages (celui que
// lancerAgent() fait circuler) dans .my-harness/sessions/<uuid>.json ;
// /resume le relit pour reprendre une conversation après un redémarrage.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { WORKSPACE } from "./tools/security/sandbox";
import type { MessageLLM } from "./llm";

export type SessionMeta = {
    id: string;
    titre: string;      // dérivé du premier message utilisateur
    creeLe: string;      // ISO
    misAJourLe: string;  // ISO
};

export type Session = SessionMeta & { messages: MessageLLM[] };

const dossier = () => resolve(WORKSPACE, ".my-harness/sessions");

function titrer(messages: MessageLLM[]): string {
    const premier = messages.find(m => m.role === "user")?.content?.trim();
    if (!premier) return "(session vide)";
    return premier.length > 60 ? `${premier.slice(0, 60)}…` : premier;
}

// Accepte un id complet ou un préfixe (ce qu'on tape depuis la liste /resume,
// pas l'UUID entier) — erreur si rien ou plusieurs fichiers correspondent.
async function resoudreFichier(refId: string): Promise<string> {
    const fichiers = (await readdir(dossier()).catch(() => [])).filter(f => f.endsWith(".json"));
    const correspondances = fichiers.filter(f => f.startsWith(refId));
    if (correspondances.length === 0) throw new Error(`Aucune session "${refId}".`);
    if (correspondances.length > 1) {
        throw new Error(`"${refId}" est ambigu (${correspondances.length} sessions correspondent) — précise l'id.`);
    }
    return correspondances[0]!;
}

// id === null → nouvelle session (nouvel UUID). id fourni → met à jour le
// même fichier : plusieurs /save de suite dans la même session n'empilent
// pas de doublons, seul un /clear (ou /save-clear) repart sur un nouvel id.
export async function sauvegarderSession(id: string | null, messages: MessageLLM[]): Promise<Session> {
    await mkdir(dossier(), { recursive: true });
    const maintenant = new Date().toISOString();
    const precedente = id ? await chargerSession(id).catch(() => null) : null;

    const session: Session = {
        id: id ?? randomUUID(),
        titre: titrer(messages),
        creeLe: precedente?.creeLe ?? maintenant,
        misAJourLe: maintenant,
        messages,
    };
    await writeFile(resolve(dossier(), `${session.id}.json`), JSON.stringify(session, null, 2), "utf-8");
    return session;
}

export async function chargerSession(refId: string): Promise<Session> {
    const fichier = await resoudreFichier(refId);
    return JSON.parse(await readFile(resolve(dossier(), fichier), "utf-8"));
}

export async function listerSessions(): Promise<SessionMeta[]> {
    const fichiers = (await readdir(dossier()).catch(() => [])).filter(f => f.endsWith(".json"));
    const sessions = await Promise.all(fichiers.map(async f => {
        const { messages: _messages, ...meta } =
            JSON.parse(await readFile(resolve(dossier(), f), "utf-8")) as Session;
        return meta;
    }));
    return sessions.sort((a, b) => b.misAJourLe.localeCompare(a.misAJourLe));
}
