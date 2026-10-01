import createClient from "openapi-fetch";
import type { paths } from "./generated/ticket-api";

export const ticketApi = createClient<paths>({ baseUrl: "/api" });
