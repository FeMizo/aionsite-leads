export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const directError =
      "error" in payload
        ? (payload as { error?: unknown }).error
        : undefined;

    if (typeof directError === "string" && directError.trim()) {
      return directError;
    }

    if (directError && typeof directError === "object") {
      const nestedMessage =
        "message" in directError
          ? (directError as { message?: unknown }).message
          : undefined;

      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage;
      }
    }
  }

  return fallback;
}
