// Status vocabulary shared by badges, filters, tables and tooltips.
export const STATUS_LABELS = {
  DRAFT: "Draft",
  PLANNING: "Planning",
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  RETRY_SCHEDULED: "Retry scheduled",
  VALID: "Valid",
  INVALID: "Invalid",
  PARTIAL: "Partial",
  COLLECTED: "Collected",
  PENDING: "Pending",
  PLANNED: "Planned",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Unknown";
}
