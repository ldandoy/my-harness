import { describe, it, expect } from "vitest";
import { listDirectory } from "../src/tools/listDirectory";

describe("list_directory", () => {
    it("expose un nom et une description", () => {
        expect(listDirectory.name).toBe("list_directory");
        expect(listDirectory.description.length).toBeGreaterThan(0);
    });

    it("liste le contenu d'un dossier", async () => {
        const sortie = await listDirectory.run({ path: "tests" });
        expect(sortie).toContain("test.txt");
    });

    it("échoue proprement sur un dossier inexistant", async () => {
        await expect(listDirectory.run({ path: "nexiste-pas" })).rejects.toThrow();
    });
});