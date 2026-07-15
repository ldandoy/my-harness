import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { WORKSPACE } from "./tools/security/sandbox";
import { Skill } from "./types/skill";


function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { data: {}, content: raw };
    const data: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
        const [key, ...rest] = line.split(":");
        if (key?.trim()) data[key.trim()] = rest.join(":").trim();
    }
    return { data, content: match[2].trim() };
}

export async function chargerSkills(dir: string): Promise<Skill[]> {
    const resolvedDir = resolve(WORKSPACE, dir);  // workspace/.harness/skills
    const entries = await readdir(resolvedDir, { withFileTypes: true }).catch(() => []);

    const skills = await Promise.all(
        entries
            .filter(e => e.isDirectory())
            .map(async e => {
                const raw = await readFile(`${resolvedDir}/${e.name}/skill.md`, "utf-8")
                    .catch(() => null);
                if (!raw) return null;
                const { data, content } = parseFrontmatter(raw);
                return {
                    name: data["name"] ?? e.name,
                    trigger: data["trigger"] ?? `/${e.name}`,
                    description: data["description"] ?? "",
                    instructions: content,
                } satisfies Skill;
            })
    );

    return skills.filter(Boolean) as Skill[];
}
