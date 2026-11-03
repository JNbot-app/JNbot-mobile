export type AccountAuthenticationInput = {
  premium?: boolean;
  email?: string;
  password?: string;
};

export function isOnlineMode(profile?: { onlineMode?: boolean } | null): boolean {
  return profile?.onlineMode === true;
}

export function accountAuthenticationError(
  account: AccountAuthenticationInput,
  onlineMode: boolean,
): string | null {
  const premium = account.premium === true;
  const password = account.password?.trim() ?? '';
  if (onlineMode && !premium) return 'Premium servers only accept premium accounts.';
  if (password.length > 45) return 'Use no more than 45 characters for the server password.';
  return null;
}
