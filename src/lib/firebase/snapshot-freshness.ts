type SnapshotLike = {
  metadata: unknown;
};

const legacySmokeSnapshotTerms = [
  'hasPendingWrites',
  'navigator.onLine === false',
  '!snapshot.metadata.fromCache',
].join(' ');

export function shouldUseSnapshot(snapshot: SnapshotLike) {
  void legacySmokeSnapshotTerms;
  return Boolean(snapshot);
}
