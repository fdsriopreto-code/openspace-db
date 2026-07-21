export async function waitForHttpOk(url: string, timeoutMs = 60_000, intervalMs = 1500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // API/Postgres still starting up — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
