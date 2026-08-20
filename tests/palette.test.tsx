import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { App } from "../src/ui/App";
import { COMMANDES } from "../src/commands/liste";

const BAS = "[B";
const HAUT = "[A";
const ENTREE = "\r";

const pause = (ms = 250) => new Promise(r => setTimeout(r, ms));

// Monte l'App sur un faux TTY (même approche qu'ink-testing-library, qu'on n'a
// pas en dépendance) et expose de quoi taper au clavier et lire le rendu.
function monter() {
    const stdin: any = new PassThrough();
    stdin.isTTY = true;
    stdin.setRawMode = () => { };
    stdin.ref = () => { };
    stdin.unref = () => { };

    const frames: string[] = [];
    const stdout: any = new PassThrough();
    stdout.columns = 100;
    stdout.write = (f: string) => { frames.push(f); return true; };

    const app = render(<App workspace="/tmp/ws" />, {
        stdin, stdout, debug: true, exitOnCtrlC: false,
    });

    const ecran = () => frames[frames.length - 1] ?? "";

    return {
        stdin, ecran, unmount: () => app.unmount(),
        // La ligne sélectionnée est préfixée par "❯" — mais le prompt de saisie
        // l'est aussi et ré-affiche le texte tapé. On ne regarde donc que les
        // lignes à l'intérieur du cadre de la palette (bordure "round").
        selection: () => ecran().split("\n")
            .find(l => l.includes("│") && l.includes("❯"))
            ?.match(/❯\s+(\/\w+)/)?.[1],
        async taper(texte: string) { stdin.write(texte); await pause(); },
    };
}

// Les attentes se déduisent du registre : ajouter une commande ne doit pas
// casser ces tests (c'est exactement ce qu'a fait l'arrivée de /connect).
const NOMS = COMMANDES.map(c => c.nom);
const REQUIERT_ARG = COMMANDES.find(c => c.argRequis)!;

describe("palette de commandes", () => {
    it("« / » ouvre la liste sur le premier élément", async () => {
        const t = monter();
        await t.taper("/");
        expect(t.selection()).toBe(NOMS[0]);
        t.unmount();
    });

    it("les flèches déplacent la sélection", async () => {
        const t = monter();
        await t.taper("/");
        expect(t.selection()).toBe(NOMS[0]);

        // Régression : TextInput rappelle onChange à chaque re-rendu, ce qui
        // remettait la sélection à 0 juste après l'avoir déplacée.
        await t.taper(BAS);
        expect(t.selection()).toBe(NOMS[1]);

        await t.taper(BAS);
        expect(t.selection()).toBe(NOMS[2]);

        await t.taper(HAUT);
        expect(t.selection()).toBe(NOMS[1]);

        t.unmount();
    });

    it("la sélection boucle en fin de liste", async () => {
        const t = monter();
        await t.taper("/");
        await t.taper(HAUT);          // vers le haut depuis le 1er → dernier
        expect(t.selection()).toBe(NOMS[NOMS.length - 1]);
        t.unmount();
    });

    it("taper filtre la liste et repart du premier", async () => {
        const t = monter();
        await t.taper("/");
        await t.taper(BAS);           // sélection déplacée…
        await t.taper("rem");         // …puis on filtre : retour au 1er match
        expect(t.selection()).toBe("/remember");
        t.unmount();
    });

    it("Entrée valide la commande sélectionnée, pas la première", async () => {
        const t = monter();
        await t.taper("/");
        // On descend jusqu'à une commande qui exige un argument : son message
        // d'usage est un témoin sûr, sans déclencher d'appel au LLM.
        for (let i = 0; i < NOMS.indexOf(REQUIERT_ARG.nom); i++) await t.taper(BAS);
        expect(t.selection()).toBe(REQUIERT_ARG.nom);
        await t.taper(ENTREE);

        // Si Entrée validait le 1er élément, on aurait le sélecteur de modèles.
        expect(t.ecran()).toContain(`Usage : ${REQUIERT_ARG.nom} <${REQUIERT_ARG.arg}>`);
        t.unmount();
    });

    it("la palette se referme quand on tape l'argument", async () => {
        const t = monter();
        await t.taper("/rem");
        expect(t.selection()).toBe("/remember");
        await t.taper(" ");
        expect(t.selection()).toBeUndefined();
        t.unmount();
    });
});
