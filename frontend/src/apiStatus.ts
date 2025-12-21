export type ApiErrorReport = {
  message: string;
  status?: number;
  method?: string;
  url?: string;
  at: number;
  retry?: () => Promise<unknown>;
};

type ApiStatusEvent =
  | { type: "error"; error: ApiErrorReport }
  | { type: "offline"; offline: boolean };

type Listener = (event: ApiStatusEvent) => void;

const listeners = new Set<Listener>();

export const subscribeApiStatus = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const publishApiError = (error: ApiErrorReport) => {
  listeners.forEach((listener) => listener({ type: "error", error }));
};

export const publishOffline = (offline: boolean) => {
  listeners.forEach((listener) => listener({ type: "offline", offline }));
};
