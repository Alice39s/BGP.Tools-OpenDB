import assert from "node:assert/strict";
import test from "node:test";

import { fetchText } from "../src/utils/http.js";

test("retries transient network failures and preserves the user agent", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let attempts = 0;
  globalThis.fetch = async (_url, options) => {
    attempts += 1;
    assert.equal(
      new Headers(options.headers).get("user-agent"),
      "custom-agent",
    );

    if (attempts === 1) {
      throw new TypeError("fetch failed");
    }

    return new Response("ok");
  };

  const result = await fetchText("https://example.test/data", {
    headers: { "User-Agent": "custom-agent" },
    maxRetries: 1,
    retryDelay: 0,
    timeout: 100,
  });

  assert.equal(result, "ok");
  assert.equal(attempts, 2);
});

test("does not retry permanent HTTP errors", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("not found", { status: 404, statusText: "Not Found" });
  };

  await assert.rejects(
    fetchText("https://example.test/missing", {
      maxRetries: 3,
      retryDelay: 0,
      timeout: 100,
    }),
    /Request failed after 1 attempt\(s\).*HTTP 404/,
  );
  assert.equal(attempts, 1);
});

test("aborts a request that exceeds its timeout", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), {
        once: true,
      });
    });

  await assert.rejects(
    fetchText("https://example.test/hanging", {
      maxRetries: 0,
      timeout: 10,
    }),
    /Request failed after 1 attempt.*Request timed out after 10ms/,
  );
});
