const OPENAPI_URL = "https://about.wukai.work/openapi.json";

const problemDetails = (request, status, overrides = {}) => {
  const url = new URL(request.url);
  const defaults = status === 404
    ? {
        title: "API endpoint not found",
        detail: `No API endpoint exists at ${url.pathname}.`,
        code: "API_NOT_FOUND",
        hint: `Discover supported endpoints at ${OPENAPI_URL}.`
      }
    : {
        title: "Upstream API error",
        detail: "The API could not complete the request.",
        code: "API_UPSTREAM_ERROR",
        hint: `Check the request and consult ${OPENAPI_URL}.`
      };
  const code = overrides.code ?? defaults.code;
  const detail = overrides.detail ?? defaults.detail;

  const body = {
    type: `https://about.wukai.work/problems/${code.toLowerCase().replaceAll("_", "-")}`,
    title: overrides.title ?? defaults.title,
    status,
    detail,
    instance: `${url.pathname}${url.search}`,
    code,
    message: detail,
    hint: overrides.hint ?? defaults.hint
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/problem+json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...overrides.headers
    }
  });
};

export const handleRequest = async (request, originFetch = fetch) => {
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) {
    return originFetch(request);
  }

  if (url.pathname === "/api/site.json" && !["GET", "HEAD"].includes(request.method)) {
    return problemDetails(request, 405, {
      title: "Method not allowed",
      detail: `${request.method} is not supported for ${url.pathname}.`,
      code: "METHOD_NOT_ALLOWED",
      hint: "Use GET to retrieve the site metadata.",
      headers: {
        Allow: "GET, HEAD"
      }
    });
  }

  let response;
  try {
    response = await originFetch(request);
  } catch {
    return problemDetails(request, 502, {
      title: "Origin unavailable",
      detail: "The static origin could not be reached.",
      code: "ORIGIN_UNAVAILABLE",
      hint: "Retry later or consult the OpenAPI document for supported endpoints."
    });
  }

  if (response.ok || response.headers.get("content-type")?.includes("json")) {
    return response;
  }

  return problemDetails(request, response.status);
};

export default {
  fetch(request) {
    return handleRequest(request);
  }
};
