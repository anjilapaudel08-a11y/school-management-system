export async function readCreditRequestBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      return null;
    }

    const body: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      body[key] = entry;
    }
    return body;
  } catch {
    return null;
  }
}
