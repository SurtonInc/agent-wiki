/** Deployment-wide feature choices; unset preserves existing installations. */
export function conversationsEnabled(env = process.env) {
  const value = env.WIKI_CONVERSATIONS;
  if (value === undefined || value === "1") return true;
  if (value === "0") return false;
  throw new Error("WIKI_CONVERSATIONS must be 0 or 1");
}
