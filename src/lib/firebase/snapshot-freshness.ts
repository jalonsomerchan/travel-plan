type SnapshotMetadataLike = {
  fromCache: boolean;
  hasPendingWrites: boolean;
};

type SnapshotLike = {
  metadata: SnapshotMetadataLike;
};

export function shouldUseSnapshot(snapshot: SnapshotLike) {
  if (snapshot.metadata.hasPendingWrites) {
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  return !snapshot.metadata.fromCache;
}
