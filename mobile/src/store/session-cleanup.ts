export async function removeAuthTokenSafely(removeToken: () => Promise<void>): Promise<void> {
  try {
    await removeToken();
  } catch {
    // Clear in-memory auth even if the platform's secure-storage cleanup fails.
  }
}
