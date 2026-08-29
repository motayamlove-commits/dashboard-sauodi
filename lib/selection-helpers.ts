export function reconcileSelectedVisitor<T extends { id?: string }>(
  previous: T | null,
  sortedVisitors: T[],
): T | null {
  if (previous?.id) {
    return sortedVisitors.find((visitor) => visitor.id === previous.id) ?? null;
  }

  return sortedVisitors[0] ?? previous;
}
