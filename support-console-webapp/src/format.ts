// Display helpers shared by TicketQueue and TicketDetail: the contract's enum
// values (openapi.yaml: urgencyLevel low|medium|high|urgent, status
// new|draft-ready|approved|resolved) rendered as the wireframe's title-cased
// labels ("Urgent", "Draft Ready") and mapped to the design system's status
// colors.

import type { components } from "./generated/ticket-api";

export type UrgencyLevel = components["schemas"]["Ticket"]["urgencyLevel"];
export type TicketStatus = components["schemas"]["Ticket"]["status"];

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

export function urgencyLabel(level: UrgencyLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function urgencyColor(level: UrgencyLevel): ChipColor {
  switch (level) {
    case "urgent":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
    default:
      return "default";
  }
}

export function statusLabel(status: TicketStatus): string {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function statusColor(status: TicketStatus): ChipColor {
  switch (status) {
    case "new":
      return "info";
    case "draft-ready":
      return "warning";
    case "approved":
      return "success";
    case "resolved":
      return "default";
    default:
      return "default";
  }
}

export function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
