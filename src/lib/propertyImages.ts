export function parsePropertyImages(value?: string | string[] | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  const trimmed = String(value).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to split/single.
    }
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

export function serializePropertyImages(value?: string | string[] | null): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
    return cleaned.length ? JSON.stringify(cleaned) : null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function mergePropertyImages(existing?: string | string[] | null, added?: string[] | null): string[] {
  const base = parsePropertyImages(existing);
  const add = (added || []).map((v) => String(v).trim()).filter(Boolean);
  return Array.from(new Set([...base, ...add]));
}
