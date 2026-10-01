import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/ticket-api";

type Ticket = components["schemas"]["Ticket"];
type NewTicket = components["schemas"]["NewTicket"];

// Held in module scope, not "on a server": setupWorker resolves every request
// in the page's own JS context, so any full page load (reload, typed URL, a
// link leaving the SPA) re-runs this module and resets the seed. Only
// in-app navigation (Submit -> Confirmation) carries a change forward.
let tickets: Ticket[] = [];
let nextId = 1;

function missingField(input: Partial<NewTicket> | null | undefined): string | null {
  if (!input) return "body";
  if (!input.customerName?.trim()) return "customerName";
  if (!input.customerEmail?.trim()) return "customerEmail";
  if (!input.subject?.trim()) return "subject";
  if (!input.message?.trim()) return "message";
  return null;
}

export const handlers = [
  // createTicket — public, unauthenticated (security: [] in the contract), so
  // mock/authz/gateway.ts lets every call through untouched. The only check
  // owed here is the one the real service owes: required fields present.
  http.post("/api/tickets", async ({ request }) => {
    const input = (await request.json().catch(() => null)) as Partial<NewTicket> | null;
    const missing = missingField(input);
    if (missing) {
      return HttpResponse.json(
        { code: 400, message: "Invalid submission", description: `${missing} is required` },
        { status: 400 },
      );
    }

    const created: Ticket = {
      id: String(nextId++),
      customerName: input!.customerName!,
      customerEmail: input!.customerEmail!,
      subject: input!.subject!,
      message: input!.message!,
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
