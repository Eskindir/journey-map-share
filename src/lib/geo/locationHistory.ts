import type { Position } from '@/lib/api/types';

export function appendPositionIfNew(
  prev: Position[],
  position: Position,
): Position[] {
  const lastPos = prev[prev.length - 1];
  if (
    !lastPos ||
    lastPos.latitude !== position.latitude ||
    lastPos.longitude !== position.longitude
  ) {
    return [...prev, position];
  }
  return prev;
}
