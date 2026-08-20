// Registre des process lancés en arrière-plan (serveur de dev, watcher…) :
// contrairement à run_command normal, ils survivent à l'appel d'outil qui
// les a démarrés — l'agent reprend la main tout de suite, la sortie continue
// d'arriver via les callbacks tant que le process tourne.
import { spawn } from "node:child_process";
import { WORKSPACE } from "./security/sandbox";

export type Job = {
    id: string;
    commande: string;
    statut: "actif" | "arrete";
};

type OnJobOutput = (id: string, commande: string, chunk: string) => void;
type OnJobEnd = (id: string, commande: string, code: number | null) => void;

const jobs = new Map<string, Job & { process: ReturnType<typeof spawn> }>();
let compteur = 0;
let _onOutput: OnJobOutput | undefined;
let _onEnd: OnJobEnd | undefined;

// Câblé depuis l'UI, comme setOnConfirm pour les confirmations de commande.
export function setJobCallbacks(onOutput?: OnJobOutput, onEnd?: OnJobEnd): void {
    _onOutput = onOutput;
    _onEnd = onEnd;
}

export function lancerJobBackground(commande: string): string {
    const id = `job-${++compteur}`;
    const process = spawn(commande, { cwd: WORKSPACE, shell: true });

    jobs.set(id, { id, commande, statut: "actif", process });
    process.stdout?.on("data", d => _onOutput?.(id, commande, d.toString()));
    process.stderr?.on("data", d => _onOutput?.(id, commande, d.toString()));
    process.on("exit", code => {
        const job = jobs.get(id);
        if (job) job.statut = "arrete";
        _onEnd?.(id, commande, code);
    });

    return id;
}

// Tue tous les jobs encore actifs — appelé à /clear et /exit pour ne jamais
// laisser un serveur orphelin tourner après la fin de la session.
export function arreterTousLesJobs(): void {
    for (const job of jobs.values()) {
        if (job.statut === "actif") job.process.kill();
    }
}

// Filet de sécurité pour les sorties qui ne passent pas par /exit (Ctrl+C, crash) :
// 'exit' se déclenche pour toute terminaison normale du process Node.
process.on("exit", arreterTousLesJobs);
