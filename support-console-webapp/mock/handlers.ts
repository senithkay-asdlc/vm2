// The ticket-api service, in mock mode. One handler per operation in
// specs/design/components/ticket-api/openapi.yaml, exported as `handlers`.
// mock/authz/gateway.ts (registered ahead of these, in mock/browser.ts) is the
// GATEWAY — may this caller call this operation at all? These handlers are the
// SERVICE — which rows, and the service's own business rules (like "only an
// approved ticket may be resolved"). No scope check belongs here.
//
// State lives in module scope, seeded fresh on every full page load — an edit
// made mid-walk persists across in-app navigation and is gone on reload. The
// rows below are the wireframes' own seed (`wireframes/scripts/seed.mjs`
// against wireframes.dsl), so the mocked queue reads exactly like the drawn
// one: "Can't log in" / Urgent / New, "Billing question" / Medium / Draft
// Ready, "Feature request" / Low / Resolved — plus one ticket already
// `approved`, so Mark Resolved has something to succeed on without the walk
// having to drive a ticket through every status first.

import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/ticket-api";

type Ticket = components["schemas"]["Ticket"];
type NewTicket = components["schemas"]["NewTicket"];
type DraftUpdate = components["schemas"]["DraftUpdate"];

const now = Date.now();
const minutesAgo = (n: number) => new Date(now - n * 60_000).toISOString();
const hoursAgo = (n: number) => new Date(now - n * 60 * 60_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60_000).toISOString();

let tickets: Ticket[] = [
  {
    id: "t-1",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    subject: "Can't log in",
    message: "I keep getting an error when I try to sign in since this morning.",
    urgencyLevel: "urgent",
    status: "new",
    draftReply: null,
    createdAt: minutesAgo(2),
    approvedAt: null,
    resolvedAt: null,
  },
  {
    id: "t-2",
    customerName: "Sam Customer",
    customerEmail: "sam@example.com",
    subject: "Billing question",
    message: "I was charged twice for my last invoice — can you take a look?",
    urgencyLevel: "medium",
    status: "draft-ready",
    draftReply:
      "Hi Sam, thanks for reaching out — I can see the duplicate charge on your account and I've started a refund for the second one. You should see it within 3-5 business days.",
    createdAt: hoursAgo(1),
    approvedAt: null,
    resolvedAt: null,
  },
  {
    id: "t-3",
    customerName: "Kim Customer",
    customerEmail: "kim@example.com",
    subject: "Feature request",
    message: "Would love to see dark mode support in the dashboard.",
    urgencyLevel: "low",
    status: "resolved",
    draftReply: "Hi Kim, thanks for the suggestion — I've passed this along to our product team!",
    createdAt: daysAgo(1),
    approvedAt: daysAgo(1),
    resolvedAt: daysAgo(1),
  },
  {
    id: "t-4",
    customerName: "Alex Partner",
    customerEmail: "alex@example.com",
    subject: "Integration question",
    message: "Does your API support webhook retries?",
    urgencyLevel: "medium",
    status: "approved",
    draftReply: "Hi Alex, yes — webhooks retry with exponential backoff for up to 24 hours.",
    createdAt: hoursAgo(3),
    approvedAt: hoursAgo(1),
    resolvedAt: null,
  },
];

function findTicket(id: string): Ticket | undefined {
  return tickets.find((t) => t.id === id);
}

export const handlers = [
  // Every ticket, optionally filtered — the every-row operation TicketQueue
  // loads. No scope check: a caller who does not hold tickets:read-all was
  // refused by mock/authz/gateway.ts and never reached here.
  http.get("/api/tickets", ({ request }) => {
    const url = new URL(request.url);
    const urgencyLevel = url.searchParams.get("urgencyLevel");
    const status = url.searchParams.get("status");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    let filtered = tickets;
    if (urgencyLevel) filtered = filtered.filter((t) => t.urgencyLevel === urgencyLevel);
    if (status) filtered = filtered.filter((t) => t.status === status);

    const page = filtered.slice(offset, offset + limit);
    return HttpResponse.json({
      count: filtered.length,
      next: offset + limit < filtered.length ? `/tickets?offset=${offset + limit}` : null,
      previous: offset > 0 ? `/tickets?offset=${Math.max(0, offset - limit)}` : null,
      data: page,
    });
  }),

  // One ticket's full detail — TicketDetail loads this.
  http.get("/api/tickets/:ticketId", ({ params }) => {
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json({ code: 404, message: "No such ticket" }, { status: 404 });
    }
    return HttpResponse.json(ticket);
  }),

  // Edit the drafted reply.
  http.patch("/api/tickets/:ticketId/draft", async ({ params, request }) => {
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json({ code: 404, message: "No such ticket" }, { status: 404 });
    }
    const body = (await request.json()) as DraftUpdate;
    ticket.draftReply = body.draftReply;
    return HttpResponse.json(ticket);
  }),

  // Approve the drafted reply — updates status in place; TicketDetail stays
  // on the same screen after this call.
  http.post("/api/tickets/:ticketId/approve", ({ params }) => {
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json({ code: 404, message: "No such ticket" }, { status: 404 });
    }
    ticket.status = "approved";
    ticket.approvedAt = new Date().toISOString();
    return HttpResponse.json(ticket);
  }),

  // Mark resolved — only an `approved` ticket may be resolved. This is the
  // service's own business rule (not a scope), so the mock enforces it the
  // same way the real ticket-api is documented to: a 400 otherwise, which
  // TicketDetailPage surfaces to the agent rather than hiding.
  http.post("/api/tickets/:ticketId/resolve", ({ params }) => {
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json({ code: 404, message: "No such ticket" }, { status: 404 });
    }
    if (ticket.status !== "approved") {
      return HttpResponse.json(
        {
          code: 400,
          message: "Ticket not approved",
          description: `Only an approved ticket may be resolved; this ticket is "${ticket.status}".`,
        },
        { status: 400 },
      );
    }
    ticket.status = "resolved";
    ticket.resolvedAt = new Date().toISOString();
    return HttpResponse.json(ticket);
  }),

  // Public intake — this app never calls it, but it is part of ticket-api's
  // contract and mock/plugin.ts's gateway table expects every declared
  // operation to resolve to something rather than falling through to the 501
  // catch-all.
  http.post("/api/tickets", async ({ request }) => {
    const body = (await request.json()) as NewTicket;
    if (!body?.customerName || !body?.customerEmail || !body?.subject || !body?.message) {
      return HttpResponse.json({ code: 400, message: "Invalid submission" }, { status: 400 });
    }
    const created: Ticket = {
      id: `t-${tickets.length + 1}`,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      subject: body.subject,
      message: body.message,
      urgencyLevel: "medium",
      status: "new",
      draftReply: null,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      resolvedAt: null,
    };
    tickets = [...tickets, created];
    return HttpResponse.json(created, { status: 201 });
  }),
];
