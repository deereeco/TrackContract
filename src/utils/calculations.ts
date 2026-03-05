import { Contraction, ContractionStats } from '../types/contraction';

/**
 * Calculate the duration of a contraction in seconds
 */
export const calculateDuration = (startTime: number, endTime: number): number => {
  return Math.floor((endTime - startTime) / 1000);
};

/**
 * Calculate the interval between two contractions in seconds (start-to-start)
 */
export const calculateInterval = (contraction1: Contraction, contraction2: Contraction): number => {
  const diff = contraction2.startTime - contraction1.startTime;
  return diff > 0 ? Math.floor(diff / 1000) : 0;
};

/**
 * Calculate the rest time between two contractions in seconds (end-to-start)
 */
export const calculateRestTime = (older: Contraction, newer: Contraction): number => {
  if (!older.endTime) return 0;
  const diff = newer.startTime - older.endTime;
  return diff > 0 ? Math.floor(diff / 1000) : 0;
};

/**
 * Calculate statistics for a set of contractions
 */
export const calculateStats = (contractions: Contraction[]): ContractionStats => {
  const completedContractions = contractions.filter(c => c.endTime !== null && c.duration !== null);

  if (completedContractions.length === 0) {
    return {
      total: 0,
      averageDuration: 0,
      averageInterval: 0,
      averageRestTime: 0,
      recentContractions: []
    };
  }

  // Calculate average duration
  const totalDuration = completedContractions.reduce((sum, c) => sum + (c.duration || 0), 0);
  const averageDuration = Math.floor(totalDuration / completedContractions.length);

  // Calculate average interval (start-to-start) and rest time (end-to-start)
  let totalInterval = 0;
  let intervalCount = 0;
  let totalRestTime = 0;
  let restTimeCount = 0;
  for (let i = 0; i < completedContractions.length - 1; i++) {
    const interval = calculateInterval(completedContractions[i + 1], completedContractions[i]);
    if (interval > 0) {
      totalInterval += interval;
      intervalCount++;
    }
    const restTime = calculateRestTime(completedContractions[i + 1], completedContractions[i]);
    if (restTime > 0) {
      totalRestTime += restTime;
      restTimeCount++;
    }
  }
  const averageInterval = intervalCount > 0 ? Math.floor(totalInterval / intervalCount) : 0;
  const averageRestTime = restTimeCount > 0 ? Math.floor(totalRestTime / restTimeCount) : 0;

  return {
    total: completedContractions.length,
    averageDuration,
    averageInterval,
    averageRestTime,
    lastContraction: completedContractions[0],
    recentContractions: completedContractions.slice(0, 10)
  };
};

/**
 * Get contractions within a time range
 */
export const getContractionsInTimeRange = (
  contractions: Contraction[],
  hours: number
): Contraction[] => {
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  return contractions.filter(c => c.startTime >= cutoffTime);
};

/**
 * Check if labor pattern indicates active labor (useful for alerts)
 * Active labor typically: contractions 3-5 minutes apart, lasting 45-60 seconds
 */
export const isActiveLaborPattern = (contractions: Contraction[]): boolean => {
  const recent = contractions.slice(0, 3);
  if (recent.length < 3) return false;

  const allCompleteDuration = recent.every(c =>
    c.duration && c.duration >= 45 && c.duration <= 90
  );

  if (!allCompleteDuration) return false;

  let validIntervals = 0;
  for (let i = 0; i < recent.length - 1; i++) {
    const interval = calculateInterval(recent[i + 1], recent[i]);
    if (interval >= 180 && interval <= 300) { // 3-5 minutes
      validIntervals++;
    }
  }

  return validIntervals >= 2;
};
