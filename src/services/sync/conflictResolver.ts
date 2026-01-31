import { Contraction } from '../../types/contraction';
import { ConflictResolution } from '../../types/sync';

/**
 * Resolve conflicts between local and remote versions using last-write-wins strategy
 * @param local Local version of the contraction
 * @param remote Remote version of the contraction
 * @param preferServer When true, prefer server (remote) on equal timestamps (for Firebase)
 */
export const resolveConflict = (
  local: Contraction,
  remote: Contraction,
  preferServer: boolean = false
): ConflictResolution => {
  // Last-write-wins based on updatedAt timestamp
  if (local.updatedAt > remote.updatedAt) {
    return {
      localVersion: local,
      remoteVersion: remote,
      resolvedVersion: local,
      strategy: 'local',
    };
  } else if (remote.updatedAt > local.updatedAt) {
    return {
      localVersion: local,
      remoteVersion: remote,
      resolvedVersion: remote,
      strategy: 'remote',
    };
  } else {
    // Same timestamp - when using Firebase, prefer server timestamp
    if (preferServer) {
      return {
        localVersion: local,
        remoteVersion: remote,
        resolvedVersion: remote,
        strategy: 'remote',
      };
    }

    // For Google Sheets or local-only, prefer local
    return {
      localVersion: local,
      remoteVersion: remote,
      resolvedVersion: local,
      strategy: 'local',
    };
  }
};

/**
 * Merge two arrays of contractions, resolving conflicts
 * @param local Local contractions
 * @param remote Remote contractions
 * @param preferServer When true, prefer server on equal timestamps (for Firebase)
 */
export const mergeContractions = (
  local: Contraction[],
  remote: Contraction[],
  preferServer: boolean = false
): Contraction[] => {
  const merged = new Map<string, Contraction>();

  // Add all local contractions
  local.forEach(contraction => {
    merged.set(contraction.id, contraction);
  });

  // Merge with remote, resolving conflicts
  remote.forEach(remoteContraction => {
    const localContraction = merged.get(remoteContraction.id);

    if (!localContraction) {
      // New from remote
      merged.set(remoteContraction.id, {
        ...remoteContraction,
        syncStatus: 'synced',
      });
    } else {
      // Conflict resolution
      const resolution = resolveConflict(localContraction, remoteContraction, preferServer);
      merged.set(remoteContraction.id, {
        ...resolution.resolvedVersion,
        syncStatus: 'synced',
      });
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.startTime - a.startTime);
};
