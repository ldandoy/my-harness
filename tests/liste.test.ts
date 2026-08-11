import { describe, it, expect } from "vitest";
import { filtrerCommandes, completion, trouverCommande } from "../src/commands/liste";

describe("autocomplétion des commandes", () => {
    it("« / » liste toutes les commandes", () => {
        expect(filtrerCommandes("/").length).toBeGreaterThan(0);
        expect(filtrerCommandes("/").map(c => c.nom)).toContain("/models");
    });

    it("« /mo » ne garde que les commandes qui commencent par /mo", () => {
        expect(filtrerCommandes("/mo").map(c => c.nom)).toEqual(["/models"]);
    });

    it("ne propose rien sans slash initial", () => {
        expect(filtrerCommandes("mo")).toEqual([]);
        expect(filtrerCommandes("")).toEqual([]);
    });

    it("referme la liste dès qu'on tape l'argument", () => {
        expect(filtrerCommandes("/remember ")).toEqual([]);
        expect(filtrerCommandes("/remember ma note")).toEqual([]);
    });

    it("renvoie une liste vide si rien ne correspond", () => {
        expect(filtrerCommandes("/zzz")).toEqual([]);
    });

    it("la complétion ajoute une espace pour les commandes à argument", () => {
        expect(completion({ nom: "/remember", description: "", arg: "texte" })).toBe("/remember ");
        expect(completion({ nom: "/init", description: "" })).toBe("/init");
    });

    it("chaque complétion commence bien par la saisie (contrat de TextInput)", () => {
        // TextInput cherche la 1re suggestion qui startsWith(saisie) : si ce
        // n'était pas vrai, le texte fantôme ne s'afficherait jamais.
        for (const c of filtrerCommandes("/re")) {
            expect(completion(c).startsWith("/re")).toBe(true);
        }
    });

    it("retrouve la commande depuis une saisie complète", () => {
        expect(trouverCommande("/remember ma note")?.nom).toBe("/remember");
        expect(trouverCommande("/init")?.nom).toBe("/init");
        expect(trouverCommande("bonjour")).toBeUndefined();
    });
});
