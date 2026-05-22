type SnapshotLike = {
  metadata: unknown;
};

export function shouldUseSnapshot(snapshot: SnapshotLike) {
  return Boolean(snapshot);
}
