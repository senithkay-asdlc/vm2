// wireframes.dsl: screen TicketDetail — heading (the ticket's subject), a row
// of two badges (urgency danger, status info), a "Customer message" card, a
// "Drafted reply" card with Save edits / Approve buttons (Approve stays on
// this screen and updates status in place, per the DSL comment), and a
// "Mark resolved" button that navigates back to TicketQueue.
//
// Only an `approved` ticket may be resolved (ticket-api's resolveTicket
// rejects otherwise) — that 4xx is surfaced to the agent rather than retried
// or hidden.

import { useCallback, useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ticketApi } from "../api";
import type { components } from "../generated/ticket-api";
import { statusColor, statusLabel, urgencyColor, urgencyLabel } from "../format";
import { Can } from "../authz/gates";

type Ticket = components["schemas"]["Ticket"];

export function TicketDetailPage(): JSX.Element {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoadError(null);
    const { data, error, response } = await ticketApi.GET("/tickets/{ticketId}", {
      params: { path: { ticketId } },
    });
    if (error) {
      setLoadError(response.status === 404 ? "This ticket does not exist." : "Could not load this ticket.");
      return;
    }
    setTicket(data ?? null);
    setDraft(data?.draftReply ?? "");
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdits(): Promise<void> {
    if (!ticketId) return;
    setSaving(true);
    setActionError(null);
    try {
      const { data, error } = await ticketApi.PATCH("/tickets/{ticketId}/draft", {
        params: { path: { ticketId } },
        body: { draftReply: draft },
      });
      if (error) {
        setActionError("Could not save the draft reply.");
        return;
      }
      setTicket(data ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function approve(): Promise<void> {
    if (!ticketId) return;
    setApproving(true);
    setActionError(null);
    try {
      const { data, error } = await ticketApi.POST("/tickets/{ticketId}/approve", {
        params: { path: { ticketId } },
      });
      if (error) {
        setActionError("Could not approve this ticket.");
        return;
      }
      // Stays on this screen; the ticket's status updates in place.
      setTicket(data ?? null);
    } finally {
      setApproving(false);
    }
  }

  async function markResolved(): Promise<void> {
    if (!ticketId) return;
    setResolving(true);
    setActionError(null);
    try {
      const { error, response } = await ticketApi.POST("/tickets/{ticketId}/resolve", {
        params: { path: { ticketId } },
      });
      if (error) {
        // Only an `approved` ticket may be resolved — surface the contract's
        // refusal rather than retrying or silently ignoring it.
        setActionError(
          response.status === 400 || response.status === 409
            ? "This ticket can't be marked resolved yet — approve its draft reply first."
            : "Could not mark this ticket resolved.",
        );
        return;
      }
      navigate("/tickets");
    } finally {
      setResolving(false);
    }
  }

  if (loadError) {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Ticket</PageTitle.Header>
        </PageTitle>
        <Typography color="error">{loadError}</Typography>
      </PageContent>
    );
  }

  if (!ticket) {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Loading…</PageTitle.Header>
        </PageTitle>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>{ticket.subject}</PageTitle.Header>
      </PageTitle>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip label={urgencyLabel(ticket.urgencyLevel)} color={urgencyColor(ticket.urgencyLevel)} />
        <Chip label={statusLabel(ticket.status)} color={statusColor(ticket.status)} />
      </Stack>

      {actionError ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {actionError}
        </Typography>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Customer message" />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {ticket.customerEmail}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {ticket.message}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Drafted reply" />
        <CardContent>
          <TextField
            multiline
            fullWidth
            minRows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Hi, thanks for reaching out..."
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
            <Can op="PATCH /tickets/{ticketId}/draft">
              <Button variant="outlined" onClick={() => void saveEdits()} disabled={saving}>
                Save edits
              </Button>
            </Can>
            <Can op="POST /tickets/{ticketId}/approve">
              <Button variant="contained" onClick={() => void approve()} disabled={approving}>
                Approve
              </Button>
            </Can>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Can op="POST /tickets/{ticketId}/resolve">
          <Button variant="outlined" onClick={() => void markResolved()} disabled={resolving}>
            Mark resolved
          </Button>
        </Can>
      </Box>
    </PageContent>
  );
}
