const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log error message
 * @param {string} message Error message
 * @param {Error|Object} [error] Error object or additional context
 */
export function logError(message, error) {
  if (LOG_LEVEL >= LOG_LEVELS.ERROR) {
    console.error(`❌ [${getTimestamp()}] ERROR: ${message}`);
    if (error) {
      console.error(error.stack || error);
    }
  }
}

/**
 * Log warning message
 * @param {string} message Warning message
 * @param {Object} [context] Additional context
 */
export function logWarn(message, context) {
  if (LOG_LEVEL >= LOG_LEVELS.WARN) {
    console.warn(`⚠️  [${getTimestamp()}] WARN: ${message}`);
    if (context) {
      console.warn(context);
    }
  }
}

/**
 * Log info message
 * @param {string} message Info message
 * @param {Object} [context] Additional context
 */
export function logInfo(message, context) {
  if (LOG_LEVEL >= LOG_LEVELS.INFO) {
    console.log(`ℹ️  [${getTimestamp()}] INFO: ${message}`);
    if (context) {
      console.log(context);
    }
  }
}

/**
 * Log debug message
 * @param {string} message Debug message
 * @param {Object} [context] Additional context
 */
export function logDebug(message, context) {
  if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(`🐛 [${getTimestamp()}] DEBUG: ${message}`);
    if (context) {
      console.log(context);
    }
  }
}

/**
 * Log step with emoji and timing
 * @param {string} step Step description
 * @param {string} emoji Emoji for the step
 */
export function logStep(step, emoji = "🔄") {
  console.log(`${emoji} ${step}...`);
}

/**
 * Log success with checkmark
 * @param {string} message Success message
 */
export function logSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * Measure and log execution time of a function
 * @param {string} operationName Name of the operation
 * @param {Function} fn Function to measure
 * @returns {Promise<any>} Result of the function
 */
export async function measureTime(operationName, fn) {
  const startTime = Date.now();
  logStep(`Starting ${operationName}`, "⏱️");

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logSuccess(`${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`${operationName} failed after ${duration}ms`, error);
    throw error;
  }
}
