export const queryKeys = {
  auth: {
    profile: () => ['auth', 'profile'] as const,
  },
  settings: {
    public: () => ['settings', 'public'] as const,
  },
} as const

