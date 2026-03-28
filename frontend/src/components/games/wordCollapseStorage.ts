export const loadStoredBool = (key: string, fallback: boolean) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
};

export const storeBool = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

export const loadStoredNumber = (key: string, fallback: number) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

export const storeNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

export const loadStoredString = (key: string, fallback: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
};

export const storeString = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

export const loadStoredStringArray = (key: string, fallback: string[]) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((value) => String(value)).filter(Boolean);
  } catch {
    return fallback;
  }
};

export const storeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};
