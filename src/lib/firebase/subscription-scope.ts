export type Unsubscribe = () => void;

export function createSubscriptionScope() {
  const unsubscribers = new Set<Unsubscribe>();

  return {
    add(unsubscribe: Unsubscribe | null | undefined) {
      if (unsubscribe) {
        unsubscribers.add(unsubscribe);
      }

      return unsubscribe;
    },
    clear() {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
      unsubscribers.clear();
    },
    size() {
      return unsubscribers.size;
    },
  };
}
