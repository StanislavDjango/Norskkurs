const isDev = import.meta.env.DEV;

export const log = (...args: unknown[]) => {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log(...args);
};

export const warn = (...args: unknown[]) => {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
};

export const error = (...args: unknown[]) => {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.error(...args);
};
