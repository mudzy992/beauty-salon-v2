export class StoredTokenUnavailableError extends Error {
  constructor() {
    super('Secure token storage is unavailable.');
    this.name = 'StoredTokenUnavailableError';
  }
}

export type StoredTokenRead =
  | { status: 'available'; token: string | null }
  | { status: 'unavailable' };

export async function readTokenSafely(
  readToken: () => Promise<string | null>,
): Promise<StoredTokenRead> {
  try {
    return { status: 'available', token: await readToken() };
  } catch {
    return { status: 'unavailable' };
  }
}
