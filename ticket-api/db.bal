// Persistence for the Ticket entity, against the ticket-db platform resource
// (postgres-cnpg). The client is constructed once at module load but its
// result is captured as a value rather than `check`-ed, so an unreachable or
// unconfigured database never stops the service from starting — it only
// makes every DB-backed call answer a clear error, mapped to 500 by the
// resource functions that call it.
import ballerina/log;
import ballerina/sql;
import ballerina/time;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

type TicketRow record {|
    string id;
    string customerName;
    string customerEmail;
    string subject;
    string message;
    string urgencyLevel;
    string status;
    string? draftReply;
    time:Utc createdAt;
    time:Utc? approvedAt;
    time:Utc? resolvedAt;
|};

type CountRow record {|
    int total;
|};

function effectiveDbPort() returns int {
    string rawPort = ticketDbPort.trim();
    if rawPort == "" {
        return DEFAULT_TICKET_DB_PORT;
    }
    int|error parsed = int:fromString(rawPort);
    if parsed is error {
        log:printWarn("TICKET_DB_PORT is not a valid integer; using the default",
            configuredValue = rawPort, 'default = DEFAULT_TICKET_DB_PORT);
        return DEFAULT_TICKET_DB_PORT;
    }
    return parsed;
}

function initTicketDbClient() returns postgresql:Client|error {
    string host = ticketDbHost.trim() == "" ? DEFAULT_TICKET_DB_HOST : ticketDbHost;
    string name = ticketDbName.trim() == "" ? DEFAULT_TICKET_DB_NAME : ticketDbName;
    string user = ticketDbUser.trim() == "" ? DEFAULT_TICKET_DB_USER : ticketDbUser;
    int port = effectiveDbPort();
    return new (host = host, username = user, password = ticketDbPassword, database = name, port = port);
}

final postgresql:Client|error ticketDbClientResult = initTicketDbClient();

function ensureTicketsTable() returns error? {
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return;
    }
    sql:ParameterizedQuery createTable = `CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        urgency_level TEXT NOT NULL,
        status TEXT NOT NULL,
        draft_reply TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        approved_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ
    )`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(createTable);
    if result is sql:Error {
        return result;
    }
}

// Runs once at module load. Captured as a value (never `check`ed) for the
// same reason as the client itself: an unreachable database must not stop
// this service from starting — it only logs, and the table is created lazily
// should a later attempt succeed against a client call.
final error? ticketsTableReady = ensureTicketsTableAndWarn();

function ensureTicketsTableAndWarn() returns error? {
    error? result = ensureTicketsTable();
    if result is error {
        log:printWarn("could not ensure the tickets table exists at startup; the database "
            + "may be unreachable right now", 'error = result);
    }
    return result;
}

function fetchTicketRow(string ticketId) returns TicketRow?|error {
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    sql:ParameterizedQuery q = `SELECT id, customer_name AS "customerName", customer_email AS "customerEmail",
        subject, message, urgency_level AS "urgencyLevel", status, draft_reply AS "draftReply",
        created_at AS "createdAt", approved_at AS "approvedAt", resolved_at AS "resolvedAt"
        FROM tickets WHERE id = ${ticketId}`;
    TicketRow|sql:Error result = dbClient->queryRow(q);
    if result is sql:NoRowsError {
        return ();
    }
    if result is sql:Error {
        return result;
    }
    return result;
}

function insertTicketRow(TicketRow row) returns error? {
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    sql:ParameterizedQuery q = `INSERT INTO tickets
        (id, customer_name, customer_email, subject, message, urgency_level, status, draft_reply, created_at, approved_at, resolved_at)
        VALUES (${row.id}, ${row.customerName}, ${row.customerEmail}, ${row.subject}, ${row.message},
        ${row.urgencyLevel}, ${row.status}, ${row.draftReply}, ${row.createdAt}, ${row.approvedAt}, ${row.resolvedAt})`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(q);
    if result is sql:Error {
        return result;
    }
}

function updateDraftReplyRow(string ticketId, string draftReply) returns TicketRow?|error {
    TicketRow?|error existing = fetchTicketRow(ticketId);
    if existing is error {
        return existing;
    }
    if existing is () {
        return ();
    }
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    sql:ParameterizedQuery q = `UPDATE tickets SET draft_reply = ${draftReply} WHERE id = ${ticketId}`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(q);
    if result is sql:Error {
        return result;
    }
    return fetchTicketRow(ticketId);
}

function approveTicketRow(string ticketId) returns TicketRow?|error {
    TicketRow?|error existing = fetchTicketRow(ticketId);
    if existing is error {
        return existing;
    }
    if existing is () {
        return ();
    }
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    time:Utc approvedAt = time:utcNow();
    sql:ParameterizedQuery q = `UPDATE tickets SET status = 'approved', approved_at = ${approvedAt} WHERE id = ${ticketId}`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(q);
    if result is sql:Error {
        return result;
    }
    return fetchTicketRow(ticketId);
}

// `"not-approved"` signals the one business-rule rejection this entity has:
// resolving a ticket that is not currently `approved`.
function resolveTicketRow(string ticketId) returns TicketRow?|"not-approved"|error {
    TicketRow?|error existing = fetchTicketRow(ticketId);
    if existing is error {
        return existing;
    }
    if existing is () {
        return ();
    }
    TicketRow currentRow = existing;
    if currentRow.status != "approved" {
        return "not-approved";
    }
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    time:Utc resolvedAt = time:utcNow();
    sql:ParameterizedQuery q = `UPDATE tickets SET status = 'resolved', resolved_at = ${resolvedAt} WHERE id = ${ticketId}`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(q);
    if result is sql:Error {
        return result;
    }
    return fetchTicketRow(ticketId);
}

function countTickets(string? urgencyLevel, string? status) returns int|error {
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    sql:ParameterizedQuery filter = buildFilterClause(urgencyLevel, status);
    sql:ParameterizedQuery q = sql:queryConcat(`SELECT COUNT(*) AS total FROM tickets`, filter);
    CountRow|sql:Error result = dbClient->queryRow(q);
    if result is sql:Error {
        return result;
    }
    return result.total;
}

function listTicketRows(string? urgencyLevel, string? status, int 'limit, int offset) returns TicketRow[]|error {
    postgresql:Client|error dbClient = ticketDbClientResult;
    if dbClient is error {
        return dbClient;
    }
    sql:ParameterizedQuery filter = buildFilterClause(urgencyLevel, status);
    sql:ParameterizedQuery q = sql:queryConcat(
        `SELECT id, customer_name AS "customerName", customer_email AS "customerEmail",
        subject, message, urgency_level AS "urgencyLevel", status, draft_reply AS "draftReply",
        created_at AS "createdAt", approved_at AS "approvedAt", resolved_at AS "resolvedAt"
        FROM tickets`,
        filter,
        ` ORDER BY created_at DESC LIMIT ${'limit} OFFSET ${offset}`
    );
    stream<TicketRow, sql:Error?> rowStream = dbClient->query(q);
    TicketRow[] rows = [];
    sql:Error? streamError = from TicketRow row in rowStream
        do {
            rows.push(row);
        };
    check rowStream.close();
    if streamError is sql:Error {
        return streamError;
    }
    return rows;
}

function buildFilterClause(string? urgencyLevel, string? status) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery filter = ` WHERE 1 = 1`;
    if urgencyLevel is string {
        filter = sql:queryConcat(filter, ` AND urgency_level = ${urgencyLevel}`);
    }
    if status is string {
        filter = sql:queryConcat(filter, ` AND status = ${status}`);
    }
    return filter;
}

function rowToTicket(TicketRow row) returns Ticket|error {
    "low"|"medium"|"high"|"urgent" urgencyLevel = check row.urgencyLevel.cloneWithType();
    "new"|"draft-ready"|"approved"|"resolved" status = check row.status.cloneWithType();
    string createdAt = time:utcToString(row.createdAt);
    time:Utc? approvedAtUtc = row.approvedAt;
    time:Utc? resolvedAtUtc = row.resolvedAt;
    string? approvedAt = approvedAtUtc is time:Utc ? time:utcToString(approvedAtUtc) : ();
    string? resolvedAt = resolvedAtUtc is time:Utc ? time:utcToString(resolvedAtUtc) : ();
    return {
        id: row.id,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        subject: row.subject,
        message: row.message,
        urgencyLevel: urgencyLevel,
        status: status,
        draftReply: row.draftReply,
        createdAt: createdAt,
        approvedAt: approvedAt,
        resolvedAt: resolvedAt
    };
}
