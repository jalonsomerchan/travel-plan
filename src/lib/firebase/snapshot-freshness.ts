type SnapshotLike = {
  metadata: unknown;
};

export function shouldUseSnapshot(snapshot: SnapshotLike) {
  void snapshot;
  return true;
}
