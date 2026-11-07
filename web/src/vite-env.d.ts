/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** API farklı bir adresteyse (ör. https://api.example.com). Boşsa aynı origin kullanılır. */
  readonly VITE_API_URL?: string;
}
