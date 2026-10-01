# vm2 — PRD

## Problem Statement

Support teams receive a steady stream of incoming tickets that must be read, prioritized, and answered quickly. Today, agents triage tickets manually — reading each one, judging how urgent it is, and writing a reply from scratch — which is slow, inconsistent (urgency judgment varies by agent and by mood), and delays replies to the customers who need help most.

## Solution

A support triage agent that reads every incoming ticket, classifies its urgency, and drafts a reply — so a human support agent reviews a prioritized queue with a ready-to-edit draft on each ticket, rather than starting from a blank page.

## Actors

- **Customer** — submits a support ticket through a built-in form; does not sign in and has no further interaction with the system beyond submission.
- **Support Agent** — signs in, views the ticket queue ordered by AI-classified urgency, reviews each ticket's AI-drafted reply, edits it as needed, approves it, and marks the ticket resolved once they have sent the reply themselves outside the system.

## User Stories

1. As a Customer, I want to submit a support ticket through a form, so that I can get help without needing an account.
2. As a Support Agent, I want incoming tickets to be automatically classified by urgency, so that I can prioritize my work without reading every ticket first.
3. As a Support Agent, I want to see an AI-drafted reply on each ticket, so that I don't have to write every response from scratch.
4. As a Support Agent, I want to edit a drafted reply before using it, so that I can tailor it to the specific customer and situation.
5. As a Support Agent, I want to approve a drafted reply, so that I have a clear record that it was reviewed and is ready to send.
6. As a Support Agent, I want to mark a ticket as resolved after I've sent the reply myself, so that the queue reflects what is still outstanding.
7. As a Support Agent, I want to view and filter the ticket queue by urgency and status, so that I can work the most urgent open tickets first.
8. As a Support Agent, I want to see full ticket details (the customer's original message and any history), so that I have the context I need before approving or editing a reply.

## Product Decisions

- **Sign-in**: Support agents sign in via SSO through Thunder, the platform IDP (org default). Customers do not sign in — ticket submission is anonymous/self-service through the public form.
- **Ticket intake**: Tickets are submitted through a built-in form provided by this product; there is no integration with an external helpdesk tool.
- **Reply delivery**: The system never sends a reply itself. An approved draft is handed to the Support Agent, who sends it manually through whatever channel they already use (email, the helpdesk, etc.) and then marks the ticket resolved here.
- **Urgency levels**: Tickets are classified into four levels — Low, Medium, High, Urgent. *assumed*
- **Classification &amp; drafting**: An AI component classifies each incoming ticket's urgency and generates its draft reply automatically on submission, before any agent looks at it. *assumed*

## Out of Scope

- Integration with any external helpdesk or ticketing platform.
- The system sending replies to customers on an agent's behalf.
- Customer-facing ticket status tracking (customers cannot check status after submitting).
- Supervisor/admin roles, reassignment, or team management — only the Support Agent role exists.

## Open Questions

1. Should Support Agents receive a notification (e.g. email) when a new Urgent ticket arrives, or is the in-app queue the only place urgency surfaces?
2. Can any Support Agent see and act on every ticket, or should tickets be assigned to a specific agent?

## Further Notes

None.

