/**
 * Process array in batches to avoid blocking event loop
 * @param {Array} items Items to process
 * @param {Function} processFn Function to process each item
 * @param {number} batchSize Size of each batch
 * @param {number} delay Delay between batches in ms
 * @returns {Promise<Array>} Results array
 */
export async function processBatches(
  items,
  processFn,
  batchSize = 1000,
  delay = 10,
) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);

    // Yield control to event loop
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * Limit concurrent operations
 * @param {Array} tasks Array of async functions
 * @param {number} concurrency Maximum concurrent operations
 * @returns {Promise<Array>} Results array
 */
export async function limitConcurrency(tasks, concurrency = 5) {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation Async operation to retry
 * @param {Object} options Retry options
 * @returns {Promise<any>} Operation result
 */
export async function retryWithBackoff(
  operation,
  {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (error) => true,
  } = {},
) {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      console.warn(
        `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a simple in-memory cache
 * @param {number} ttl Time to live in milliseconds
 * @returns {Object} Cache object with get/set/clear methods
 */
export function createCache(ttl = 300000) {
  // 5 minutes default
  const cache = new Map();

  return {
    get(key) {
      const item = cache.get(key);
      if (!item) return null;

      if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }

      return item.value;
    },

    set(key, value) {
      cache.set(key, {
        value,
        expiry: Date.now() + ttl,
      });
    },

    clear() {
      cache.clear();
    },

    size() {
      return cache.size;
    },
  };
}

/**
 * Debounce function execution
 * @param {Function} fn Function to debounce
 * @param {number} delay Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function execution
 * @param {Function} fn Function to throttle
 * @param {number} interval Interval in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, interval) {
  let lastCall = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Memory usage monitoring
 * @returns {Object} Memory usage statistics
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  };
}

/**
 * Log memory usage with optional label
 * @param {string} label Label for the memory usage log
 */
export function logMemoryUsage(label = "Memory Usage") {
  const usage = getMemoryUsage();
  console.log(
    `📊 ${label}: RSS=${usage.rss}MB, Heap=${usage.heapUsed}/${usage.heapTotal}MB, External=${usage.external}MB`,
  );
}
