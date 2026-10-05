// localStorage with an in-memory fallback (private windows, sandboxed embeds).
const memory = new Map<string, string>();

export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // Quota errors should surface; access errors fall back to memory.
      if (e instanceof DOMException && e.name === "QuotaExceededError") throw e;
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
