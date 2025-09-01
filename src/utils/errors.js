export const createBGPError = (
  message,
  code = "UNKNOWN_ERROR",
  details = {},
) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
};

export const createNetworkError = (message, url, status, details = {}) =>
  createBGPError(message, "NETWORK_ERROR", { url, status, ...details });

export const createDataParsingError = (message, dataType, details = {}) =>
  createBGPError(message, "DATA_PARSING_ERROR", { dataType, ...details });

export const createFileSystemError = (message, operation, path, details = {}) =>
  createBGPError(message, "FILESYSTEM_ERROR", { operation, path, ...details });

export const createValidationError = (message, field, value, details = {}) =>
  createBGPError(message, "VALIDATION_ERROR", { field, value, ...details });

export const tryAsync = async (fn, context = {}) => {
  try {
    return await fn();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      // Already a BGP error, just enhance it
      error.details = { ...error.details, ...context };
      throw error;
    }
    throw createBGPError(
      error.message || "Unknown error occurred",
      "UNKNOWN_ERROR",
      {
        originalError: error.constructor.name,
        ...context,
      },
    );
  }
};

// Safe parsing utilities
export const parseJSON = (jsonString, context = "unknown") => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw createDataParsingError(
      `Failed to parse JSON: ${error.message}`,
      "JSON",
      {
        context,
        sample: jsonString.slice(0, 100),
      },
    );
  }
};

export const parseNumber = (value, field = "number") => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw createValidationError("Invalid number value", field, value);
    }
    return value;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createValidationError("Cannot parse as number", field, value);
  }

  return parsed;
};

// Validation utilities
export const isValidCIDR = (cidr) => {
  if (typeof cidr !== "string") return false;

  const [ip, prefix] = cidr.split("/");
  if (!ip || !prefix) return false;

  const prefixNum = parseInt(prefix);
  if (!Number.isInteger(prefixNum)) return false;

  // IPv4
  if (ip.includes(".")) {
    const octets = ip.split(".");
    return (
      octets.length === 4 &&
      prefixNum >= 0 &&
      prefixNum <= 32 &&
      octets.every((octet) => {
        const num = parseInt(octet);
        return Number.isInteger(num) && num >= 0 && num <= 255;
      })
    );
  }

  // IPv6
  if (ip.includes(":")) {
    return prefixNum >= 0 && prefixNum <= 128 && /^[0-9a-fA-F:]+$/.test(ip);
  }

  return false;
};

export const isValidASN = (asn) => {
  const asnNum = typeof asn === "string" ? parseInt(asn) : asn;
  return Number.isInteger(asnNum) && asnNum > 0 && asnNum <= 4294967295;
};

// Error conversion utilities
export const convertNodeError = (error, operation, context = {}) => {
  switch (error.code) {
    case "ENOTFOUND":
    case "ECONNREFUSED":
      return createNetworkError(
        `Network error during ${operation}: ${error.message}`,
        context.url || "unknown",
        error.code,
        context,
      );
    case "ENOENT":
    case "EACCES":
      return createFileSystemError(
        `File system error during ${operation}: ${error.message}`,
        operation,
        error.path || "unknown",
        context,
      );
    default:
      return createBGPError(
        `Error during ${operation}: ${error.message}`,
        "UNKNOWN_ERROR",
        {
          originalError: error.constructor.name,
          ...context,
        },
      );
  }
};
