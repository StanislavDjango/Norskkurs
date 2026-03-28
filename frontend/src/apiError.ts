import axios, { type AxiosError } from "axios";

type ApiErrorFieldValue = string | string[] | null | undefined;

export type ApiErrorPayload = {
  detail?: string;
  error?: string;
  [key: string]: ApiErrorFieldValue | unknown;
};

export const getAxiosError = (error: unknown): AxiosError<ApiErrorPayload> | null => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error;
  }
  return null;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  return getAxiosError(error)?.response?.status;
};

export const getApiErrorMessage = (error: unknown, fallback = "API error"): string => {
  const axiosError = getAxiosError(error);
  const responseData = axiosError?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    if (typeof responseData.detail === "string") {
      return responseData.detail;
    }
    if (typeof responseData.error === "string") {
      return responseData.error;
    }

    const fieldMessages = Object.entries(responseData)
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}: ${value.map(String).join(" ")}`;
        }
        if (typeof value === "string") {
          return `${field}: ${value}`;
        }
        return [];
      })
      .filter(Boolean);

    if (fieldMessages.length > 0) {
      return fieldMessages.join(" ");
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
