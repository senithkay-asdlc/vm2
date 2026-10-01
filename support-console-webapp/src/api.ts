// The ticket-api client: openapi-fetch typed against the generated contract,
// same-origin at /api (nginx proxies /api/ to the ticket-api sibling — see
// nginx/default.conf and nginx/15-aep-api-proxy.sh). Authorization is entirely
// src/authz/client.ts's: this module adds nothing of its own about it, and
// attaches the bearer / applies the 401 rule through one middleware.

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/ticket-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const ticketApi = createClient<paths>({ baseUrl: "/api" });
ticketApi.use(authMiddleware);
