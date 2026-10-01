// Schemas from specs/design/components/ticket-api/openapi.yaml, as generated
// by `bal openapi --mode service` (and renamed for readability where that
// does not change the JSON shape on the wire).
import ballerina/http;

public type Ticket record {
    string id;
    string customerName;
    string customerEmail;
    string subject;
    string message;
    # AI-assigned urgency
    "low"|"medium"|"high"|"urgent" urgencyLevel;
    "new"|"draft-ready"|"approved"|"resolved" status;
    # AI-generated draft, editable by a Support Agent
    string? draftReply?;
    string createdAt;
    string? approvedAt?;
    string? resolvedAt?;
};

public type NewTicket record {
    string customerName;
    string customerEmail;
    string subject;
    string message;
};

public type DraftUpdate record {
    string draftReply;
};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type TicketOk record {|
    *http:Ok;
    Ticket body;
|};

public type TicketCreated record {|
    *http:Created;
    Ticket body;
|};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};

// Not declared on resolveTicket in openapi.yaml, which names only 200/404/401
// for that operation — there is no documented status for "this ticket is not
// yet approved". 409 Conflict is the smallest addition that lets the service
// honour the issue's explicit acceptance rule ("resolving an unapproved
// ticket is rejected") without reusing a code that already means something
// else on this operation. Flagged in the PR/issue thread as a one-line spec
// gap; nothing else about the contract is touched.
public type ErrorConflict record {|
    *http:Conflict;
    Error body;
|};

// The 200 envelope for GET /tickets. The OpenAPI tool names this
// `inline_response_200`; renamed here only for readability — the JSON shape
// (count, next, previous, data) is unchanged.
public type TicketListResponse record {
    # total matching tickets
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Ticket[] data;
};
