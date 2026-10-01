// All configuration this service reads is declared here, in one place, as
// one-line `configurable` reads of the exact platform-injected env var names
// from workload.yaml. Nothing elsewhere calls `os:getEnv` directly.
//
// Gateway assertion verification (GATEWAY_ASSERTION_CERTIFICATE / _ISSUER /
// _HEADER) is read inside gateway_assertion.bal, a verbatim copied asset —
// that file is its own exception to "one config module", by design.
//
// None of these reads can fail or panic: `os:getEnv` returns "" for an unset
// variable, so the service always starts. Where a value is structurally
// required to do useful work (the DB connection, the AI API key) an empty
// value is handled at the point of use — a lazily-created client that
// captures its own init error, or a request that fails gracefully — never a
// crash at module-load time.
import ballerina/os;

configurable string ticketDbHost = os:getEnv("TICKET_DB_HOST");
configurable string ticketDbPort = os:getEnv("TICKET_DB_PORT");
configurable string ticketDbName = os:getEnv("TICKET_DB_DBNAME");
configurable string ticketDbUser = os:getEnv("TICKET_DB_USER");
configurable string ticketDbPassword = os:getEnv("TICKET_DB_PASSWORD");

configurable string anthropicApiKey = os:getEnv("ANTHROPIC_API_KEY");
configurable string anthropicVersion = os:getEnv("ANTHROPIC_VERSION");

// Sensible fallbacks — never crash on a missing value, just behave
// reasonably until the real one is injected.
const string DEFAULT_TICKET_DB_HOST = "localhost";
const int DEFAULT_TICKET_DB_PORT = 5432;
const string DEFAULT_TICKET_DB_NAME = "ticket_api";
const string DEFAULT_TICKET_DB_USER = "postgres";
const string DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
const string CLASSIFICATION_MODEL = "claude-3-5-sonnet-latest";
