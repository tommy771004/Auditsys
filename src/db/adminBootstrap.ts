export interface AdminBootstrapConfig {
  username: string;
  password: string;
}

export function resolveAdminBootstrapConfig(env: NodeJS.ProcessEnv = process.env): AdminBootstrapConfig | null {
  const username = env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters");
  }

  return {
    username,
    password,
  };
}
