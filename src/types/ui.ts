export type Role = "user" | "agent" | "tool" | "assistant";
export type Ligne = { role: Role; text: string };