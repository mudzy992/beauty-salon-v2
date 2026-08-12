type ReservationServiceItem = {
  service?: { name?: string | null } | null;
};

export const formatReservationServicesLabel = (params: {
  items?: ReservationServiceItem[];
  fallbackServiceName?: string | null;
}): string => {
  const names = (params.items ?? [])
    .map((it) => it.service?.name?.trim())
    .filter((n): n is string => Boolean(n));
  if (names.length === 1) return names[0]!;
  if (names.length > 1) return `${names[0]} + ${names.length - 1}`;
  const fallback = params.fallbackServiceName?.trim();
  return fallback || 'Usluga';
};
