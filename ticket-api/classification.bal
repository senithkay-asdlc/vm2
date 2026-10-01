// Calls the ai-classification-service external dependency (Anthropic's
// Messages API) synchronously on ticket creation, to set urgencyLevel and
// generate draftReply before the create response returns.
import ballerina/log;
import ticket_api.anthropic;

type ClassificationResult record {|
    "low"|"medium"|"high"|"urgent" urgencyLevel;
    string draftReply;
|};

final anthropic:Client|error anthropicClientResult = initAnthropicClient();

function initAnthropicClient() returns anthropic:Client|error {
    anthropic:ApiKeysConfig keys = {x\-api\-key: anthropicApiKey};
    return new (keys);
}

function classificationSystemPrompt() returns string {
    return "You are a support-ticket triage assistant for a customer support team. "
        + "Given a customer's ticket subject and message, do two things: "
        + "1) classify its urgency as exactly one of low, medium, high, or urgent; "
        + "2) draft a short, polite, helpful reply a support agent can review, edit, and send. "
        + "Respond with ONLY a single JSON object, no markdown fences and no extra text, "
        + "matching exactly this shape: "
        + "{\"urgencyLevel\": \"low\"|\"medium\"|\"high\"|\"urgent\", \"draftReply\": \"<the drafted reply text>\"}.";
}

// Classifies urgency and drafts a reply for a newly submitted ticket.
//
// + subject - the ticket's subject
// + message - the ticket's original message
// + return - the classification, or an error when the call or its response
//   could not be used — the caller maps that to a 500, since this platform
//   makes no promise about a fallback value for a dependency it cannot reach
function classifyTicket(string subject, string message) returns ClassificationResult|error {
    anthropic:Client|error aiClient = anthropicClientResult;
    if aiClient is error {
        return aiClient;
    }
    anthropic:Message userMessage = {
        role: "user",
        content: string `Subject: ${subject}\nMessage: ${message}`
    };
    anthropic:CreateMessageRequest request = {
        model: CLASSIFICATION_MODEL,
        max_tokens: 1024,
        system: classificationSystemPrompt(),
        messages: [userMessage]
    };
    string version = anthropicVersion.trim() == "" ? DEFAULT_ANTHROPIC_VERSION : anthropicVersion;
    anthropic:CreateMessageHeaders headers = {anthropic\-version: version};
    anthropic:CreateMessageResponse|error response = aiClient->/v1/messages.post(request, headers);
    if response is error {
        log:printError("ai-classification-service call failed", 'error = response);
        return response;
    }
    string text = extractResponseText(response);
    ClassificationResult|error parsed = parseClassification(text);
    if parsed is error {
        log:printError("could not parse ai-classification-service response", 'error = parsed, raw = text);
        return parsed;
    }
    return parsed;
}

function extractResponseText(anthropic:CreateMessageResponse response) returns string {
    string combined = "";
    foreach anthropic:ContentBlock block in response.content {
        string? blockText = block.text;
        if blockText is string {
            combined = combined + blockText;
        }
    }
    return combined;
}

// Claude is asked to answer with raw JSON, but strips the first `{` to the
// last `}` defensively in case it still wraps the answer in a markdown fence.
function parseClassification(string text) returns ClassificationResult|error {
    string trimmed = text.trim();
    int? startIndex = trimmed.indexOf("{");
    int? endIndex = trimmed.lastIndexOf("}");
    if startIndex is () || endIndex is () || endIndex < startIndex {
        return error("ai-classification-service response carried no JSON object");
    }
    string jsonText = trimmed.substring(startIndex, endIndex + 1);
    json|error parsedJson = jsonText.fromJsonString();
    if parsedJson is error {
        return parsedJson;
    }
    ClassificationResult|error result = parsedJson.cloneWithType();
    return result;
}
