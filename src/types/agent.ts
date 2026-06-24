export type ConfirmChoice = "once" | "always" | "never";

export type AgentCallbacks = {
    onTour?: (n: number) => void;
    onTool?: (name: string, args: Record<string, unknown>) => void;
    onResponse?: (text: string) => void;
    onConfirm?: (prog: string) => Promise<ConfirmChoice>;
};