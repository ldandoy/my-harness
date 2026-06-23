import { describe, it, expect } from "vitest";
import { truncate } from "../src/format";

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