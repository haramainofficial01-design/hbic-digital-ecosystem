/** Bounded, process-local read cache. Never use for authentication/payment state. */
export function createReadCache<T>(read: () => Promise<T>, ttlMs: number, clock = Date.now) {
  let generation = 0;
  let saved: { key: string; value: T; expires: number } | undefined;
  let pending: { key: string; generation: number; promise: Promise<T> } | undefined;
  return {
    clear() { generation += 1; saved = undefined; pending = undefined; },
    async get(key = "default"): Promise<T> {
      if (saved?.key === key && clock() < saved.expires) return structuredClone(saved.value);
      if (pending?.key === key && pending.generation === generation) return structuredClone(await pending.promise);
      const startedGeneration = generation;
      const promise = read();
      const flight = { key, generation: startedGeneration, promise };
      pending = flight;
      try {
        const value = await promise;
        if (generation === startedGeneration) saved = { key, value: structuredClone(value), expires: clock() + ttlMs };
        return structuredClone(value);
      } finally { if (pending === flight) pending = undefined; }
    }
  };
}
