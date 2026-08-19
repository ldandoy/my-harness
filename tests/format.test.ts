import { describe, it, expect } from "vitest";
import { truncate, formatDuree } from "../src/format";

describe("truncate", () => {
    it("laisse un texte court intact", () => {
        expect(truncate("bonjour", 500)).toBe("bonjour");
    });

    it("coupe un texte trop long et ajoute « […] »", () => {
        const long = "a".repeat(600);
        const resultat = truncate(long, 500);
        expect(resultat.endsWith(" […]")).toBe(true);
        expect(resultat.length).toBe(500 + " […]".length);
    });
});

describe("formatDuree", () => {
    it("affiche une décimale sous 10 secondes", () => {
        expect(formatDuree(800)).toBe("0.8s");
        expect(formatDuree(3200)).toBe("3.2s");
    });

    it("arrondit à la seconde entre 10s et 1 minute", () => {
        expect(formatDuree(45_000)).toBe("45s");
    });

    it("passe en minutes au-delà d'une minute", () => {
        expect(formatDuree(10 * 60_000)).toBe("10min");
        expect(formatDuree(59 * 60_000)).toBe("59min");
    });

    it("passe en heures au-delà de 60 minutes, avec les minutes restantes", () => {
        expect(formatDuree(60 * 60_000)).toBe("1h");
        expect(formatDuree(90 * 60_000)).toBe("1h30");
        expect(formatDuree((2 * 60 + 5) * 60_000)).toBe("2h05");
    });
});