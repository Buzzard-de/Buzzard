import { listVisitors } from "./registry";

export function computeRetentionMetrics(): {
  newVisitors: number;
  returningVisitors: number;
  returningSessions: number;
} {
  const visitors = listVisitors();
  const newVisitors = visitors.filter((v) => !v.isReturning).length;
  const returningVisitors = visitors.filter((v) => v.isReturning).length;
  const returningSessions = visitors
    .filter((v) => v.isReturning)
    .reduce((sum, v) => sum + v.sessionCount, 0);

  return { newVisitors, returningVisitors, returningSessions };
}
