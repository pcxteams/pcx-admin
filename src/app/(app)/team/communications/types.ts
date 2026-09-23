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

/** The KAN-154 template types, mirroring the API's email-templates module. */
export interface TemplateMergeField {
  token: string;
  description: string;
  sample: string;
  /** A save that drops this field is rejected. Usually the action link. */
  requiredInBody: boolean;
}

/** One supported automated email. */
export interface EmailTemplate {
  key: string;
  name: string;
  purpose: string;
  trigger: string;
  mergeFields: TemplateMergeField[];
  /** What PCx sends when the Workspace has not customized this template. */
  defaultSubject: string;
  defaultBody: string;
  /** What this Workspace sends today. */
  subject: string;
  body: string;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface EmailTemplateInventory {
  workspaceId: string;
  workspaceName: string;
  sender: {
    fromEmail: string;
    senderDisplayName: string;
    replyToEmail: string;
  };
  templates: EmailTemplate[];
}

export interface EmailTemplatePreview {
  subject: string;
  html: string;
  text: string;
  sampleData: { token: string; description: string; value: string }[];
}
