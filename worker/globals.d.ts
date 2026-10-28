// src/config/store.ts lê import.meta.env (Vite). No Worker ele não existe e o código cai em {}.
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
