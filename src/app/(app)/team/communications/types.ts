/** Mirrors the API's EmailSendSummary (communications module). */
export interface EmailSendSummary {
  id: string;
  /** Internal name when set, else the subject: the list's bold title. */
  title: string;
  subject: string;
  audienceLabel: string;
  recipientCount: number;
  openedCount: number;
  /** 0–100, rounded. `null` when the send has no recipients. */
  openRate: number | null;
  createdAt: string;
}
