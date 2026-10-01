// Implements specs/design/components/ticket-api/openapi.yaml exactly — same
// paths, schemas and status codes (with one pragmatic addition explained on
// ErrorConflict in types.bal). The gateway has already enforced every
// operation's scope from that same contract before a request reaches this
// service (api-management, thunder-authentication): this service holds no
// operation -> scope table and checks only that a caller is verified where a
// handler needs an identity at all. There is no per-caller ownership
// filtering — every ticket sits in one shared queue (PRD) — so a verified
// caller is all any protected handler asks for.
import ballerina/http;
import ballerina/uuid;
import ballerina/time;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    # Submit a new ticket (public, unauthenticated)
    #
    # + payload - the customer's submission
    # + return - the created ticket, already classified and drafted
    resource function post tickets(@http:Payload NewTicket payload) returns TicketCreated|ErrorBadRequest|error {
        string message = payload.message.trim();
        if message == "" {
            return <ErrorBadRequest>{
                body: {code: 400, message: "message is required", description: "A ticket submission must include a non-empty message."}
            };
        }
        ClassificationResult classification = check classifyTicket(payload.subject, payload.message);
        string ticketId = uuid:createType1AsString();
        time:Utc createdAt = time:utcNow();
        TicketRow row = {
            id: ticketId,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            subject: payload.subject,
            message: payload.message,
            urgencyLevel: classification.urgencyLevel,
            status: "new",
            draftReply: classification.draftReply,
            createdAt: createdAt,
            approvedAt: (),
            resolvedAt: ()
        };
        check insertTicketRow(row);
        Ticket ticket = check rowToTicket(row);
        return <TicketCreated>{body: ticket};
    }

    # Every ticket in the queue, optionally filtered
    #
    # + ctx - the request context the gateway-assertion interceptor wrote to
    # + urgencyLevel - optional urgency filter
    # + status - optional status filter
    # + 'limit - page size, default 20, capped at 100
    # + offset - page offset, default 0
    # + return - a paginated envelope of matching tickets
    resource function get tickets(http:RequestContext ctx, "low"|"medium"|"high"|"urgent"? urgencyLevel,
            "new"|"draft-ready"|"approved"|"resolved"? status, int 'limit = 20, int offset = 0)
            returns TicketListResponse|ErrorUnauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        int boundedLimit = boundLimit('limit);
        int boundedOffset = offset < 0 ? 0 : offset;
        int total = check countTickets(urgencyLevel, status);
        TicketRow[] rows = check listTicketRows(urgencyLevel, status, boundedLimit, boundedOffset);
        Ticket[] tickets = [];
        foreach TicketRow row in rows {
            Ticket ticket = check rowToTicket(row);
            tickets.push(ticket);
        }
        string? next = boundedOffset + boundedLimit < total
            ? pageUri(urgencyLevel, status, boundedLimit, boundedOffset + boundedLimit)
            : ();
        string? previous = boundedOffset > 0
            ? pageUri(urgencyLevel, status, boundedLimit, previousOffset(boundedOffset, boundedLimit))
            : ();
        return <TicketListResponse>{count: total, next: next, previous: previous, data: tickets};
    }

    # Every ticket's full details
    #
    # + ctx - the request context the gateway-assertion interceptor wrote to
    # + ticketId - the ticket to fetch
    # + return - the ticket's full detail, including its original message and current draft
    resource function get tickets/[string ticketId](http:RequestContext ctx)
            returns Ticket|ErrorNotFound|ErrorUnauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        TicketRow? row = check fetchTicketRow(ticketId);
        if row is () {
            return notFoundError(ticketId);
        }
        return rowToTicket(row);
    }

    # Edit a ticket's drafted reply
    #
    # + ctx - the request context the gateway-assertion interceptor wrote to
    # + ticketId - the ticket whose draft is being edited
    # + payload - the new draft text
    # + return - the ticket with its updated draft
    resource function patch tickets/[string ticketId]/draft(http:RequestContext ctx, @http:Payload DraftUpdate payload)
            returns Ticket|ErrorNotFound|ErrorUnauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        TicketRow? row = check updateDraftReplyRow(ticketId, payload.draftReply);
        if row is () {
            return notFoundError(ticketId);
        }
        return rowToTicket(row);
    }

    # Approve a ticket's drafted reply
    #
    # + ctx - the request context the gateway-assertion interceptor wrote to
    # + ticketId - the ticket to approve
    # + return - the approved ticket
    resource function post tickets/[string ticketId]/approve(http:RequestContext ctx)
            returns TicketOk|ErrorNotFound|ErrorUnauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        TicketRow? row = check approveTicketRow(ticketId);
        if row is () {
            return notFoundError(ticketId);
        }
        Ticket ticket = check rowToTicket(row);
        return <TicketOk>{body: ticket};
    }

    # Mark a ticket resolved after its reply has been sent
    #
    # + ctx - the request context the gateway-assertion interceptor wrote to
    # + ticketId - the ticket to resolve
    # + return - the resolved ticket
    resource function post tickets/[string ticketId]/resolve(http:RequestContext ctx)
            returns TicketOk|ErrorNotFound|ErrorUnauthorized|ErrorConflict|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        TicketRow?|"not-approved" result = check resolveTicketRow(ticketId);
        if result is () {
            return notFoundError(ticketId);
        }
        if result is "not-approved" {
            return <ErrorConflict>{
                body: {
                    code: 409,
                    message: "ticket not approved",
                    description: "A ticket can only be resolved after its draft has been approved."
                }
            };
        }
        Ticket ticket = check rowToTicket(result);
        return <TicketOk>{body: ticket};
    }
}

function unauthorizedError() returns ErrorUnauthorized => {body: {code: 401, message: "not signed in"}};

function notFoundError(string ticketId) returns ErrorNotFound => {
    body: {code: 404, message: "no such ticket", description: string `No ticket exists with id ${ticketId}.`}
};

function boundLimit(int requested) returns int {
    if requested < 1 {
        return 20;
    }
    if requested > 100 {
        return 100;
    }
    return requested;
}

function previousOffset(int currentOffset, int pageSize) returns int {
    int candidate = currentOffset - pageSize;
    return candidate < 0 ? 0 : candidate;
}

function pageUri(string? urgencyLevel, string? status, int 'limit, int offset) returns string {
    string query = string `limit=${'limit}&offset=${offset}`;
    if urgencyLevel is string {
        query = query + "&urgencyLevel=" + urgencyLevel;
    }
    if status is string {
        query = query + "&status=" + status;
    }
    return string `/tickets?${query}`;
}
