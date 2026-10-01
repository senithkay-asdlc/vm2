screen TicketQueue "Prioritized queue of incoming tickets"
  navbar "Support Console"
  sidebar "Queue -> TicketQueue"
  heading "Ticket Queue"
  row
    select "Urgency: All"
    select "Status: All"
    right
    search "Search tickets"
  table "Subject | Customer | Urgency | Status | Created" -> TicketDetail
    row "Can't log in | jane@example.com | Urgent | New | 2m ago"
    row "Billing question | sam@example.com | Medium | Draft Ready | 1h ago"
    row "Feature request | kim@example.com | Low | Resolved | 1d ago"

screen TicketDetail "Review a ticket's classification and drafted reply"
  navbar "Support Console"
  sidebar "Queue -> TicketQueue"
  heading "Can't log in"
  row
    badge "Urgent" danger
    badge "Draft Ready" info
  card "Customer message"
    text "jane@example.com"
    text "I keep getting an error when I try to sign in since this morning."
  card "Drafted reply"
    textarea "Hi Jane, thanks for reaching out..." 500x180
    row
      right
      button "Save edits"
      button "Approve" primary // stays on this screen; updates the ticket's status in place
  row
    right
    button "Mark resolved" -> TicketQueue

flow "Triage and resolve tickets"
  role "Support Agent"
  description "A Support Agent works the queue, reviews each draft, approves it, and resolves the ticket after sending it"
  TicketQueue
  TicketDetail
