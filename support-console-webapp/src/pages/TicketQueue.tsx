// wireframes.dsl: screen TicketQueue — navbar, sidebar, heading "Ticket Queue",
// a filter row (urgency select, status select, search — right-aligned), and a
// table (Subject | Customer | Urgency | Status | Created) whose rows navigate
// to TicketDetail. All five columns come from one GET /tickets call; search is
// filtered client-side over that same response, never a per-row request.

import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  InputAdornment,
  MenuItem,
  PageContent,
  PageTitle,
  TextField,
  Typography,
  ListingTable,
} from "@wso2/oxygen-ui";
import { Search } from "@wso2/oxygen-ui-icons-react";
import { ticketApi } from "../api";
import type { components } from "../generated/ticket-api";
import {
  formatCreatedAt,
  statusColor,
  statusLabel,
  urgencyColor,
  urgencyLabel,
  type TicketStatus,
  type UrgencyLevel,
} from "../format";

type Ticket = components["schemas"]["Ticket"];

const URGENCY_OPTIONS: UrgencyLevel[] = ["urgent", "high", "medium", "low"];
const STATUS_OPTIONS: TicketStatus[] = ["new", "draft-ready", "approved", "resolved"];

export function TicketQueuePage(): JSX.Element {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let live = true;
    setTickets(null);
    setError(null);
    void (async () => {
      const { data, error: apiError } = await ticketApi.GET("/tickets", {
        params: {
          query: {
            ...(urgency ? { urgencyLevel: urgency as UrgencyLevel } : {}),
            ...(status ? { status: status as TicketStatus } : {}),
            limit: 100,
          },
        },
      });
      if (!live) return;
      if (apiError) {
        setError("Could not load the ticket queue.");
        return;
      }
      setTickets(data?.data ?? []);
    })();
    return () => {
      live = false;
    };
  }, [urgency, status]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) => t.subject.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q),
    );
  }, [tickets, search]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Ticket Queue</PageTitle.Header>
      </PageTitle>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField select label="Urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {URGENCY_OPTIONS.map((level) => (
            <MenuItem key={level} value={level}>
              {urgencyLabel(level)}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {statusLabel(s)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          placeholder="Search tickets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Subject</ListingTable.Cell>
                <ListingTable.Cell>Customer</ListingTable.Cell>
                <ListingTable.Cell>Urgency</ListingTable.Cell>
                <ListingTable.Cell>Status</ListingTable.Cell>
                <ListingTable.Cell>Created</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {tickets === null ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={5}>Loading tickets…</ListingTable.Cell>
                </ListingTable.Row>
              ) : filtered.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={5}>No tickets match these filters.</ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                filtered.map((ticket) => (
                  <ListingTable.Row
                    key={ticket.id}
                    clickable
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <ListingTable.Cell>{ticket.subject}</ListingTable.Cell>
                    <ListingTable.Cell>{ticket.customerEmail}</ListingTable.Cell>
                    <ListingTable.Cell>
                      <Chip label={urgencyLabel(ticket.urgencyLevel)} color={urgencyColor(ticket.urgencyLevel)} size="small" />
                    </ListingTable.Cell>
                    <ListingTable.Cell>
                      <Chip label={statusLabel(ticket.status)} color={statusColor(ticket.status)} size="small" />
                    </ListingTable.Cell>
                    <ListingTable.Cell>{formatCreatedAt(ticket.createdAt)}</ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
    </PageContent>
  );
}
