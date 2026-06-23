import { describe, it, expect } from "vitest";
import { mkdir, writeFile as fsWrite, rm } from "node:fs/promises";
import { listDirectory } from "../src/tools/listDirectory";
import { resoudre } from "../src/tools/sandbox";

describe("list_directory", () => {
    it("expose un nom et une description", () => {
        expect(listDirectory.name).toBe("list_directory");
        expect(listDirectory.description.length).toBeGreaterThan(0);
    });

    it("liste le contenu du workspace", async () => {
        await mkdir(resoudre("test-lister"), { recursive: true });
        await fsWrite(resoudre("test-lister/bonjour.txt"), "hello");
        const sortie = await listDirectory.run({ path: "test-lister" });
        expect(sortie).toContain("bonjour.txt");
        await rm(resoudre("test-lister"), { recursive: true }); // nettoyage
    });

    it("échoue sur un dossier inexistant", async () => {
        await expect(listDirectory.run({ path: "nexiste-pas" })).rejects.toThrow();
    });
});