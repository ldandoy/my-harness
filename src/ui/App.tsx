import React, { useState, useRef, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { TextInput } from "@inkjs/ui";
import SelectInput from "ink-select-input";
import { Messages, ligneVersBloc, type Bloc } from "./Messages";
import { lancerAgent } from "../agent";
import type { Ligne, ConfirmChoice } from "../types";
import { ModelPicker } from "./commands/ModelPicker";
import { log } from "../logger";
import { Banner } from "./Banner";
import { cmdInit } from "../commands/init";
import type { AgentCallbacks } from "../types";
import { intercepterCommandes } from "../commands";
import { StatusBar } from "./StatusBar";
import { obtenirInfosEnv } from "./env-info";
import { CommandPalette } from "./commands/CommandPalette";
import { filtrerCommandes, completion, trouverCommande } from "../commands/liste";
import { serveurActif } from "../serveurs";
import { MODEL, HOST, CTX_MAX } from "../config";
import { obtenirCtxMax, type MessageLLM } from "../llm";
import { formatDuree } from "../format";
import { setJobCallbacks, arreterTousLesJobs } from "../tools/jobs";
import { JobsPanel, type JobActif } from "./JobsPanel";
import { setDiffCallback, trouverDiff } from "../tools/diffs";
import { DiffView } from "./DiffView";
import { AskUserPanel } from "./AskUserPanel";
import { sauvegarderSession, chargerSession, listerSessions, type SessionMeta } from "../session";
import { SessionPicker } from "./SessionPicker";

// Buffer de sortie gardé par job : large mais borné, pour ne pas laisser un
// serveur qui tourne des heures faire grossir l'état indéfiniment.
const BUFFER_MAX = 4000;

export function App({ workspace }: { workspace: string }) {
    const { exit } = useApp();

    // Clés stables pour les blocs static : Ink ne rejoue jamais un bloc déjà
    // écrit, il faut donc une clé unique par ajout, pas l'index dans le tableau.
    const compteurRef = useRef(0);
    const prochaineCle = () => `bloc-${compteurRef.current++}`;

    // La bannière est un bloc comme un autre : la rendre "live" à côté d'un
    // <Static> qui grossit la fait redessiner sous chaque nouvelle ligne
    // (TOUR n, sorties d'outil…) au lieu de rester fixe en haut.
    const banniereBloc = (): Bloc => ({
        key: prochaineCle(),
        node: <Banner workspace={workspace} serveur={serveurActif()} modele={MODEL} />,
    });

    const [blocs, setBlocs] = useState<Bloc[]>(() => [banniereBloc()]);
    const [enCours, setEnCours] = useState(false);
    const [confirmState, setConfirmState] = useState<{
        prog: string;
        resolve: (v: ConfirmChoice) => void;
    } | null>(null);
    // L'outil ask_user : question du modèle en attente de réponse.
    const [askState, setAskState] = useState<{
        question: string;
        choix?: string[];
        resolve: (v: string) => void;
    } | null>(null);
    const [showModelPicker, setShowModelPicker] = useState(false);
    // Liste à choisir pour /resume sans argument ; null = picker fermé.
    const [resumeState, setResumeState] = useState<SessionMeta[] | null>(null);

    const [envInfo] = useState(
        () => obtenirInfosEnv()
    );

    const [tokens, setTokens]
        = useState(0);
    // null tant qu'on n'a pas interrogé le serveur : on préfère ne rien
    // afficher plutôt qu'une taille de contexte par défaut trompeuse.
    const [maxTokens, setMaxTokens]
        = useState<number | null>(null);

    // Interroge la vraie taille de contexte du modèle actif — au montage,
    // puis à chaque changement de serveur ou de modèle. `modele` en paramètre
    // évite de dépendre de la config globale, mise à jour de façon asynchrone
    // par /models (retenirModele) et donc pas toujours à jour au bon moment.
    const rafraichirMaxTokens = async (modele: string = MODEL) => {
        const n = await obtenirCtxMax(HOST, modele);
        setMaxTokens(Math.min(n, CTX_MAX));
    };
    useEffect(() => { void rafraichirMaxTokens(); }, []);

    // Durée de la session : l'horodatage de départ ne bouge jamais, mais il
    // faut re-rendre régulièrement pour que l'affichage avance même sans
    // autre activité (streaming, tour…) qui déclencherait un rendu.
    const debutSessionRef = useRef(Date.now());
    const [maintenant, setMaintenant] = useState(() => Date.now());
    useEffect(() => {
        // Un vrai chrono : on veut le voir avancer seconde par seconde.
        const id = setInterval(() => setMaintenant(Date.now()), 1_000);
        return () => clearInterval(id);
    }, []);

    const historiqueRef = useRef<MessageLLM[]>([]);
    const enAttenteRef = useRef<string | null>(null);
    // null tant que la session en cours n'a jamais été sauvegardée : un
    // premier /save lui crée un id, les suivants mettent à jour le même fichier.
    const sessionIdRef = useRef<string | null>(null);

    // Historique des saisies (façon shell) : ↑/↓ pour rejouer les
    // dernières tâches soumises. `null` = pas en navigation (saisie libre).
    const historiqueSaisieRef = useRef<string[]>([]);
    const [indexHistorique, setIndexHistorique] = useState<number | null>(null);
    // Ce qu'on tapait avant d'appuyer sur ↑, pour le restituer si on
    // redescend jusqu'au bout de l'historique.
    const brouillonRef = useRef("");
    // Le tour en cours, pour qu'Échap puisse l'interrompre.
    const abortRef = useRef<AbortController | null>(null);

    // Échap : on coupe la requête en vol et on restitue la tâche dans la
    // saisie, prête à être corrigée plutôt que relancée telle quelle.
    useInput((_input, key) => {
        if (key.escape) abortRef.current?.abort();
    }, { isActive: enCours });

    // /connect change le serveur (et parfois le modèle) : on rejoue la bannière
    // comme un nouveau bloc figé, pour que le changement reste visible dans le
    // scrollback au lieu de muter un état invisible.
    const rafraichirEtat = () => {
        setBlocs(prev => [...prev, banniereBloc()]);
        void rafraichirMaxTokens();
    };

    // --- Autocomplétion des commandes ---
    const [saisie, setSaisie] = useState("");
    const [selection, setSelection] = useState(0);
    // TextInput n'est pas contrôlé : changer cette clé le remonte et vide le champ.
    const [cleInput, setCleInput] = useState(0);

    // Pendant une navigation dans l'historique (↑/↓), on ne rouvre pas la
    // palette même si le texte rappelé correspond à une commande : sinon la
    // palette (et le choix qu'elle propose) apparaît sans qu'Entrée ait été
    // pressée, et elle vole en plus les flèches à la navigation d'historique.
    const commandes = indexHistorique === null ? filtrerCommandes(saisie) : [];
    const paletteOuverte = commandes.length > 0;

    // TextInput ignore ↑/↓ et Tab (il ne gère que le curseur horizontal) :
    // on peut donc les capter ici sans lui voler ses touches.
    useInput((_input, key) => {
        if (key.upArrow) setSelection(s => (s - 1 + commandes.length) % commandes.length);
        else if (key.downArrow || key.tab) setSelection(s => (s + 1) % commandes.length);
    }, { isActive: paletteOuverte && !showModelPicker && !confirmState && !askState && !resumeState });

    // On place la commande sélectionnée en tête : TextInput complète toujours
    // avec la 1re suggestion qui correspond, donc la liste et le texte fantôme
    // restent alignés sur ce qui est surligné.
    const suggestions = paletteOuverte
        ? [completion(commandes[selection]!),
        ...commandes.filter((_, i) => i !== selection).map(completion)]
        : undefined;

    // TextInput rappelle onChange à chaque re-rendu tant que sa valeur diffère de
    // sa previousValue (son useEffect dépend de l'identité de onChange, recréée à
    // chaque rendu). Sans ce garde-fou, déplacer la sélection provoque un rendu
    // qui la remet aussitôt à 0 — les flèches semblent alors sans effet.
    function surChangement(v: string) {
        if (v === saisie) return;
        setSaisie(v);
        setSelection(0);   // la saisie a vraiment changé → on repart du premier
        // Une vraie frappe sort de la navigation dans l'historique : la
        // prochaine flèche haut repartira de la fin, pas d'où on était.
        setIndexHistorique(null);
    }

    // ↑/↓ hors palette : on parcourt l'historique des tâches déjà soumises,
    // comme dans un shell. Désactivé pendant la navigation de palette pour
    // ne pas lui voler les flèches.
    useInput((_input, key) => {
        const hist = historiqueSaisieRef.current;
        if (key.upArrow) {
            if (hist.length === 0) return;
            if (indexHistorique === null) brouillonRef.current = saisie;
            const suivant = indexHistorique === null
                ? hist.length - 1
                : Math.max(0, indexHistorique - 1);
            setIndexHistorique(suivant);
            setSaisie(hist[suivant]!);
            setCleInput(k => k + 1);
        } else if (key.downArrow) {
            if (indexHistorique === null) return;
            const suivant = indexHistorique + 1;
            if (suivant >= hist.length) {
                setIndexHistorique(null);
                setSaisie(brouillonRef.current);
            } else {
                setIndexHistorique(suivant);
                setSaisie(hist[suivant]!);
            }
            setCleInput(k => k + 1);
        }
    }, { isActive: !paletteOuverte && !showModelPicker && !confirmState && !askState && !resumeState });

    function demanderChoix(prog: string): Promise<ConfirmChoice> {
        return new Promise(resolve => setConfirmState({ prog, resolve }));
    }

    // L'outil ask_user : le modèle attend la réponse avant de reprendre la main.
    function demanderAvisUtilisateur(question: string, choix?: string[]): Promise<string> {
        return new Promise(resolve => setAskState({ question, choix, resolve }));
    }

    const ajouter = (role: Ligne["role"], text: string) =>
        setBlocs(prev => [...prev, ligneVersBloc(prochaineCle(), { role, text })]);

    // Jobs lancés en arrière-plan (run_command background: true) : leur sortie
    // vit ici, hors du scrollback figé, tant qu'ils tournent encore.
    const [jobsActifs, setJobsActifs] = useState<Record<string, JobActif>>({});
    useEffect(() => {
        setJobCallbacks(
            (id, commande, chunk) => setJobsActifs(prev => ({
                ...prev,
                [id]: {
                    commande,
                    sortie: ((prev[id]?.sortie ?? "") + chunk).slice(-BUFFER_MAX),
                },
            })),
            (id, commande, code) => {
                setJobsActifs(prev => {
                    const { [id]: _fini, ...reste } = prev;
                    return reste;
                });
                ajouter("tool", `🖥 ${commande} (${id}) arrêté (code ${code ?? "?"})`);
            },
        );
    }, []);

    // Diff d'une écriture de fichier : une simple ligne récap dans le
    // scrollback ("📝 [3] index.html (+8 -4)") — le diff complet ne
    // s'affiche que sur demande via /diff, pour ne pas noyer les étapes.
    useEffect(() => {
        setDiffCallback(entree => {
            const suffixe = entree.nouveauFichier ? ", nouveau fichier" : "";
            ajouter("tool",
                `📝 [${entree.id}] ${entree.chemin} (${entree.resume}${suffixe}) — /diff ${entree.id} pour voir`);
        });
    }, []);

    // Sauvegarde la session en cours (upsert sur sessionIdRef) — utilisé par
    // /save et /save-clear. `null` si rien à sauvegarder.
    async function sauvegarderSessionCourante() {
        if (historiqueRef.current.length === 0) return null;
        const session = await sauvegarderSession(sessionIdRef.current, historiqueRef.current);
        sessionIdRef.current = session.id;
        return session;
    }

    // Remet la conversation à zéro : utilisé par /clear et /save-clear. Un
    // id de session à null force /save à en créer un nouveau au prochain appel.
    function reinitialiserSession() {
        historiqueRef.current = [];
        sessionIdRef.current = null;
        setBlocs([]);
        arreterTousLesJobs();
        setJobsActifs({});
    }

    // Charge une session sauvegardée (id complet, exact) et en fait la
    // session courante — utilisé par /resume <id> et par le SessionPicker.
    async function reprendreSession(id: string) {
        setResumeState(null);
        try {
            const session = await chargerSession(id);
            reinitialiserSession();
            historiqueRef.current = session.messages;
            sessionIdRef.current = session.id;
            ajouter("tool", `↻ Session reprise — "${session.titre}" (${session.messages.length} messages)`);
        } catch (e) {
            ajouter("tool", `✗ ${(e as Error).message}`);
        }
    }

    // Vrai tant qu'une ligne de réponse est "ouverte" et reçoit des fragments.
    const [ligneEnCours, setLigneEnCours] = useState<Ligne | null>(null);

    // Premier fragment → on crée la ligne ; les suivants → on la complète.
    const onChunk = (delta: string) => {
        setLigneEnCours(prev => prev
            ? { ...prev, text: prev.text + delta }
            : { role: "agent", text: `🤖 ${delta}` });
    };

    // Fin de réponse : on remplace la ligne streamée par le texte complet
    // (au cas où le modèle n'aurait rien streamé, on ajoute une ligne).
    const onResponse = (t: string) => {
        setLigneEnCours(null);
        ajouter("agent", `🤖 ${t}`);
    };

    // Chaque nouveau tour repart d'une ligne neuve : sinon le texte d'un tour
    // qui se termine par un appel d'outil (donc sans onResponse) se ferait
    // compléter par les fragments du tour suivant.
    function creerCallbacks(): AgentCallbacks {
        return {
            onTour: () => setLigneEnCours(null),
            onTool: (n, a) => {
                setLigneEnCours(null);
                // write_file : le contenu complet arrive de toute façon juste après
                // sous forme de diff, inutile (et illisible) de le dupliquer ici.
                const affichage = n === "write_file" ? { path: a.path } : a;
                ajouter("tool", `🔧 ${n}(${JSON.stringify(affichage)})`);
            },
            onChunk,
            onResponse,
            onConfirm: demanderChoix,
            onAskUser: demanderAvisUtilisateur,
            onTokens: (prompt, _r, max) => { setTokens(prompt); setMaxTokens(max); },
        };
    }

    // Un seul créneau d'attente : on peut composer la prochaine tâche pendant
    // que l'agent tourne, elle se lance dès que le tour en cours se termine.
    function terminerTour() {
        setEnCours(false);
        const suivante = enAttenteRef.current;
        if (suivante !== null) {
            enAttenteRef.current = null;
            void soumettre(suivante);
        }
    }

    // Échap a coupé la requête : on abandonne la tâche en attente (l'utilisateur
    // va la corriger lui-même) et on remet le prompt annulé dans la saisie.
    function annulerTour(tache: string) {
        enAttenteRef.current = null;
        setLigneEnCours(null);
        ajouter("tool", "⏹ Requête annulée.");
        setEnCours(false);
        setSaisie(tache);
        setCleInput(k => k + 1);
    }

    async function soumettre(tache: string) {
        log(`soumettre() — "${tache}"`);

        // Vide le champ et referme la palette, quel que soit le chemin pris ensuite.
        setSaisie("");
        setSelection(0);
        setCleInput(k => k + 1);

        if (tache.trim() === "") return;

        // On garde la tâche dans l'historique de saisie (sauf répétition
        // immédiate, pour ne pas polluer ↑ avec la même ligne en boucle).
        const dernieres = historiqueSaisieRef.current;
        if (dernieres[dernieres.length - 1] !== tache) dernieres.push(tache);
        setIndexHistorique(null);

        // Un tour tourne déjà : on garde la saisie pour la rejouer à la fin,
        // au lieu de lancer un second appel concurrent à lancerAgent().
        if (enCours) {
            enAttenteRef.current = tache;
            return;
        }

        // Entrée sur une commande complétée mais sans son argument :
        // on rappelle l'usage au lieu de la lancer à vide.
        const commande = trouverCommande(tache);
        if (commande?.argRequis && tache.trim() === commande.nom) {
            ajouter("tool", `Usage : ${commande.nom} <${commande.arg}>`);
            return;
        }

        const cb: AgentCallbacks = creerCallbacks();

        if (tache.trim() === "/models") {
            setShowModelPicker(true);
            return;
        }

        if (tache.trim() === "/init") {
            setEnCours(true);
            await cmdInit(creerCallbacks());
            terminerTour();
            return;
        }

        if (tache.trim() === "/diff" || tache.trim().startsWith("/diff ")) {
            const argument = tache.trim().slice("/diff".length).trim();
            const id = argument === "" ? undefined : Number(argument);
            const entree = trouverDiff(id);
            if (!entree) {
                ajouter("tool", argument === ""
                    ? "Aucune écriture de fichier dans cette session pour l'instant."
                    : `Aucun diff #${argument} dans cette session.`);
            } else {
                setBlocs(prev => [...prev, {
                    key: prochaineCle(),
                    node: <DiffView chemin={entree.chemin} lignes={entree.lignes}
                        nouveauFichier={entree.nouveauFichier} />,
                }]);
            }
            return;
        }

        if (tache.trim() === "/clear") {
            reinitialiserSession();
            ajouter("tool", "✓ Contexte de session réinitialisé.");
            return;
        }

        if (tache.trim() === "/save") {
            const session = await sauvegarderSessionCourante();
            ajouter("tool", session
                ? `✓ Session sauvegardée — id ${session.id.slice(0, 8)}, "${session.titre}"`
                : "Rien à sauvegarder pour l'instant.");
            return;
        }

        if (tache.trim() === "/save-clear") {
            const session = await sauvegarderSessionCourante();
            reinitialiserSession();
            ajouter("tool", session
                ? `✓ Sauvegardée (id ${session.id.slice(0, 8)}) puis contexte réinitialisé.`
                : "✓ Contexte réinitialisé (rien à sauvegarder).");
            return;
        }

        if (tache.trim() === "/resume" || tache.trim().startsWith("/resume ")) {
            const argument = tache.trim().slice("/resume".length).trim();

            if (argument === "") {
                const sessions = await listerSessions();
                if (sessions.length === 0) ajouter("tool", "Aucune session sauvegardée.");
                else setResumeState(sessions);   // ouvre le SessionPicker
                return;
            }

            // Id tapé directement (ex: repris d'un historique de commandes) :
            // toujours possible, en plus du picker.
            await reprendreSession(argument);
            return;
        }

        if (tache.trim() === "/exit") {
            arreterTousLesJobs();
            exit();
            return;
        }

        // /connect peut changer serveur ET modèle : on rejoue la bannière.
        if (await intercepterCommandes(tache, cb)) { rafraichirEtat(); return; }

        ajouter("user", `❯ ${tache}`);
        setEnCours(true);
        const controller = new AbortController();
        abortRef.current = controller;
        const debut = Date.now();
        try {
            historiqueRef.current = await lancerAgent(
                tache, cb, historiqueRef.current, controller.signal
            );
            ajouter("tool", `⏱️ ${formatDuree(Date.now() - debut)}`);
            terminerTour();
            log("lancerAgent() terminé");
        } catch (e) {
            if ((e as Error).name !== "AbortError") throw e;
            annulerTour(tache);
        } finally {
            abortRef.current = null;
        }
    }

    return (
        <Box flexDirection="column" padding={1}>
            <Messages blocs={blocs} ligneEnCours={ligneEnCours} enCours={enCours} />
            <JobsPanel jobs={jobsActifs} />

            {!showModelPicker && !confirmState && !askState && !resumeState && (
                <Box flexDirection="column" marginTop={1}>
                    {/* Bordure haut/bas seulement : elle souligne la zone de
                        saisie sans l'enfermer dans un cadre. */}
                    <Box
                        borderStyle="single"
                        borderColor="cyan"
                        borderLeft={false}
                        borderRight={false}
                        paddingX={1}
                    >
                        <Text color="cyan">❯ </Text>
                        <TextInput
                            key={cleInput}
                            defaultValue={saisie}
                            placeholder="Quelle est ta prochaine tâche ? (/ pour les commandes)"
                            suggestions={suggestions}
                            onChange={surChangement}
                            onSubmit={soumettre}
                        />
                    </Box>
                    <CommandPalette commandes={commandes} selection={selection} />
                </Box>
            )}

            {showModelPicker && (
                <ModelPicker
                    onDone={choisi => {
                        ajouter("tool", `✓ Modèle changé : ${choisi}`);
                        setShowModelPicker(false);
                        void rafraichirMaxTokens(choisi);
                    }}
                />
            )}

            {confirmState && (
                <Box flexDirection="column" borderStyle="single"
                    borderColor="yellow" paddingX={2}>
                    <Text color="yellow">⚠ Autoriser "{confirmState.prog}" ?</Text>
                    <SelectInput
                        items={[
                            { label: "Une fois", value: "once" },
                            { label: "Toujours", value: "always" },
                            { label: "Refuser", value: "never" },
                        ]}
                        onSelect={item => {
                            confirmState.resolve(item.value as ConfirmChoice);
                            setConfirmState(null);
                        }}
                    />
                </Box>
            )}

            {askState && (
                <AskUserPanel
                    question={askState.question}
                    choix={askState.choix}
                    onReponse={reponse => {
                        ajouter("tool", `❓ ${askState.question} → ${reponse}`);
                        askState.resolve(reponse);
                        setAskState(null);
                    }}
                />
            )}

            {resumeState && (
                <SessionPicker sessions={resumeState} onChoisir={id => void reprendreSession(id)} />
            )}

            <StatusBar
                {...envInfo}
                tokens={tokens}
                maxTokens={maxTokens}
                modele={MODEL}
                dureeSession={maintenant - debutSessionRef.current}
            />
        </Box>
    );
}