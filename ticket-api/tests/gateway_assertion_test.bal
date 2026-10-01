// Verifies the gateway-assertion interceptor (gateway_assertion.bal) against
// a throwaway RSA keypair — nothing here talks to a real gateway or IdP.
//
// Before `bal test` runs, the harness must export all three (see the
// ballerina skill's "Verify" section):
//   GATEWAY_ASSERTION_CERTIFICATE = contents of tests/resources/trusted-cert.pem
//   GATEWAY_ASSERTION_ISSUER      = "ticket-api-test-gateway"
//   GATEWAY_ASSERTION_HEADER      = "x-jwt-assertion"
// Without the full trio the interceptor falls back to its unverified mode and
// every assertion here would fail for a reason this file does not name.
//
// Four cases, per the skill: a valid assertion is accepted; one signed by a
// different key is a 401; one whose payload was edited after signing is a
// 401 (never an anonymous caller); and the one public operation answers
// without requiring any assertion at all.
import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/test;

const string TEST_ISSUER = "ticket-api-test-gateway";
const string TEST_HEADER = "x-jwt-assertion";
const string TRUSTED_KEY_FILE = "tests/resources/trusted-key.pem";
const string OTHER_KEY_FILE = "tests/resources/other-key.pem";

final http:Client gatewayTestClient = check new ("http://localhost:9090");

function mintAssertion(string keyFile, string scope) returns string|error {
    crypto:PrivateKey signingKey = check crypto:decodeRsaPrivateKeyFromKeyFile(keyFile);
    jwt:IssuerConfig issuerConfig = {
        issuer: TEST_ISSUER,
        username: "test-supportagent",
        expTime: 300,
        customClaims: {
            "scope": scope,
            "ouHandle": "test-org"
        },
        signatureConfig: {
            config: signingKey
        }
    };
    return jwt:issue(issuerConfig);
}

// Breaks the signature by editing a byte of the payload segment after
// signing — the header and signature segments are untouched, so this is
// specifically "tampered", not "wrong key".
function tamperPayload(string token) returns string {
    string[] parts = re `\.`.split(token);
    if parts.length() != 3 {
        return token;
    }
    string header = parts[0];
    string payload = parts[1];
    string signature = parts[2];
    string lastChar = payload.substring(payload.length() - 1, payload.length());
    string replacement = lastChar == "A" ? "B" : "A";
    string tamperedPayload = payload.substring(0, payload.length() - 1) + replacement;
    return header + "." + tamperedPayload + "." + signature;
}

@test:Config {}
function testValidAssertionIsAccepted() returns error? {
    string token = check mintAssertion(TRUSTED_KEY_FILE, "tickets:read-all");
    http:Response response = check gatewayTestClient->get("/tickets", headers = {[TEST_HEADER]: token});
    // The interceptor must accept it — whatever listTickets then does against
    // a database this sandbox has no real connection to is a separate
    // concern. A 401 here would mean the interceptor rejected a validly
    // signed, correctly issued assertion, which is the one outcome this test
    // exists to catch.
    test:assertNotEquals(response.statusCode, 401, "a validly signed assertion must not be refused by the interceptor");
}

@test:Config {}
function testAssertionSignedByDifferentKeyIs401() returns error? {
    string token = check mintAssertion(OTHER_KEY_FILE, "tickets:read-all");
    http:Response response = check gatewayTestClient->get("/tickets", headers = {[TEST_HEADER]: token});
    test:assertEquals(response.statusCode, 401, "an assertion signed by a key other than the gateway's must be refused");
}

@test:Config {}
function testTamperedAssertionIs401() returns error? {
    string validToken = check mintAssertion(TRUSTED_KEY_FILE, "tickets:read-all");
    string tampered = tamperPayload(validToken);
    http:Response response = check gatewayTestClient->get("/tickets", headers = {[TEST_HEADER]: tampered});
    test:assertEquals(response.statusCode, 401, "a tampered assertion must be refused, never downgraded to anonymous");
}

@test:Config {}
function testPublicOperationNeedsNoAssertion() returns error? {
    // createTicket (`security: []`) must never be gated on the assertion.
    // An empty message is rejected by validation before any dependency call,
    // so this is a deterministic 400 regardless of what ticket-db or
    // ai-classification-service are reachable in this sandbox — the point is
    // that it is 400, and specifically not 401: the interceptor let the
    // request through with no caller at all, exactly as `security: []`
    // requires.
    json payload = {customerName: "Jane", customerEmail: "jane@example.com", subject: "Can't log in", message: ""};
    http:Response response = check gatewayTestClient->post("/tickets", payload);
    test:assertEquals(response.statusCode, 400, "a public operation must be reachable with no assertion header at all");
}
