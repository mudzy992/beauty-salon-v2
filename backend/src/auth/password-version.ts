export const getPasswordVersion = (
  passwordChangedAt: Date | null | undefined,
): number => {
  if (passwordChangedAt == null) return 0;

  const version = passwordChangedAt.getTime();
  if (!Number.isSafeInteger(version)) {
    throw new Error('Invalid password change timestamp');
  }
  return version;
};

export const matchesPasswordVersion = (
  passwordChangedAt: Date | null | undefined,
  tokenVersion: unknown,
): boolean => {
  let currentVersion: number;
  try {
    currentVersion = getPasswordVersion(passwordChangedAt);
  } catch {
    return false;
  }

  // Accept pre-claim JWTs only for accounts that have never changed passwords.
  if (tokenVersion === undefined) return currentVersion === 0;

  return (
    typeof tokenVersion === 'number' &&
    Number.isSafeInteger(tokenVersion) &&
    tokenVersion === currentVersion
  );
};
