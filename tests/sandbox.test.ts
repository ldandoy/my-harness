import { describe, it, expect } from "vitest";
import { resoudre, WORKSPACE } from "../src/tools/sandbox";

describe("resoudre (sandbox)", () => {
    it("accepte un chemin dans le workspace", () => {
        expect(resoudre("index.html").startsWith(WORKSPACE)).toBe(true);
    });

    it("refuse de sortir du workspace", () => {
        expect(() => resoudre("../secret.txt")).toThrow(/refusé/);
        expect(() => resoudre("../../etc/passwd")).toThrow();
    });
});