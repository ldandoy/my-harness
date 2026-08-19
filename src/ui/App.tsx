import React, { useState, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
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

export function App({ workspace }: { workspace: string }) {
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
    const [showModelPicker, setShowModelPicker] = useState(false);

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

    const historiqueRef = useRef<MessageLLM[]>([]);
    const enAttenteRef = useRef<string | null>(null);
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

    const commandes = filtrerCommandes(saisie);
    const paletteOuverte = commandes.length > 0;

    // TextInput ignore ↑/↓ et Tab (il ne gère que le curseur horizontal) :
    // on peut donc les capter ici sans lui voler ses touches.
    useInput((_input, key) => {
        if (key.upArrow) setSelection(s => (s - 1 + commandes.length) % commandes.length);
        else if (key.downArrow || key.tab) setSelection(s => (s + 1) % commandes.length);
    }, { isActive: paletteOuverte && !showModelPicker && !confirmState });

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
    }

    function demanderChoix(prog: string): Promise<ConfirmChoice> {
        return new Promise(resolve => setConfirmState({ prog, resolve }));
    }

    const ajouter = (role: Ligne["role"], text: string) =>
        setBlocs(prev => [...prev, ligneVersBloc(prochaineCle(), { role, text })]);

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
            onTool: (n, a) => { setLigneEnCours(null); ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`); },
            onChunk,
            onResponse,
            onConfirm: demanderChoix,
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

        if (tache.trim() === "/clear") {
            historiqueRef.current = [];
            setBlocs([]);
            ajouter("tool", "✓ Contexte de session réinitialisé.");
            return;
        }

        // /connect peut changer serveur ET modèle : on rejoue la bannière.
        if (await intercepterCommandes(tache, cb)) { rafraichirEtat(); return; }

        ajouter("user", `❯ ${tache}`);
        setEnCours(true);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            historiqueRef.current = await lancerAgent(
                tache, cb, historiqueRef.current, controller.signal
            );
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

            {!showModelPicker && !confirmState && (
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

            <StatusBar
                {...envInfo}
                tokens={tokens}
                maxTokens={maxTokens}
                modele={MODEL}
            />
        </Box>
    );
}