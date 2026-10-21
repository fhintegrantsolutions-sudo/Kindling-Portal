// Change request types — shared by the lender form, the server actions and the
// admin pages. Pure data; safe to import from client and server.

export type ChangeRequestType =
  | "mailing_address"
  | "w9"
  | "entity_email"
  | "login_email"
  | "name"
  | "la_title"
  | "la_entity_type"
  | "la_business_name"
  | "add_entity"
  | "other";

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "select" | "textarea";
  options?: readonly string[];
  placeholder?: string;
};

export const ENTITY_TYPE_OPTIONS = [
  "Individual",
  "LLC",
  "Trust",
  "Corporation",
  "Partnership",
  "IRA",
  "Other",
] as const;

export type TypeDef = {
  type: ChangeRequestType;
  label: string;
  // Needs the lender to choose which of their entities it applies to.
  needsEntity: boolean;
  // Approving writes the requested values automatically; otherwise an admin
  // makes the change by hand and marks the request complete.
  autoApply: boolean;
  fields: FieldDef[];
  help?: string;
  // false = not offered on the lender's request form (still used for records,
  // e.g. lenders change their mailing address directly and it's logged here).
  lenderSelectable?: boolean;
};

export const CHANGE_REQUEST_TYPES: TypeDef[] = [
  {
    type: "mailing_address",
    label: "Update mailing address",
    needsEntity: true,
    autoApply: true,
    lenderSelectable: false,
    fields: [
      { key: "address_street", label: "Street", required: true },
      { key: "address_city", label: "City", required: true },
      { key: "address_state", label: "State", required: true, placeholder: "TX" },
      { key: "address_zip", label: "ZIP code", required: true },
    ],
  },
  {
    type: "w9",
    label: "Update W-9",
    needsEntity: true,
    autoApply: false,
    fields: [],
    help: "Tell us what needs to change on the W-9 for this entity. We'll follow up with the form.",
  },
  {
    type: "entity_email",
    label: "Update email address (for an entity)",
    needsEntity: true,
    autoApply: true,
    fields: [{ key: "email", label: "New email address", required: true, type: "email" }],
  },
  {
    type: "login_email",
    label: "Update login email address",
    needsEntity: false,
    autoApply: false,
    fields: [{ key: "email", label: "New login email address", required: true, type: "email" }],
    help: "This is the email you use to sign in to the portal.",
  },
  {
    type: "name",
    label: "Change name",
    needsEntity: false,
    autoApply: true,
    fields: [
      { key: "first_name", label: "First name", required: true },
      { key: "last_name", label: "Last name", required: true },
    ],
    help: "Your legal name. Include the reason (e.g. marriage) in the message.",
  },
  {
    type: "la_title",
    label: "Loan agreement – loan agreement title",
    needsEntity: true,
    autoApply: true,
    fields: [
      {
        key: "loan_agreement_title",
        label: "Loan agreement title",
        required: true,
        placeholder: "e.g. Jane Q. Doe Revocable Trust",
      },
    ],
  },
  {
    type: "la_entity_type",
    label: "Loan agreement – entity type",
    needsEntity: true,
    autoApply: true,
    fields: [
      {
        key: "entity_type",
        label: "Entity type",
        required: true,
        type: "select",
        options: ENTITY_TYPE_OPTIONS,
      },
    ],
  },
  {
    type: "la_business_name",
    label: "Loan agreement – business / entity name",
    needsEntity: true,
    autoApply: true,
    fields: [{ key: "business_name", label: "Business / entity name", required: true }],
  },
  {
    type: "add_entity",
    label: "Add an entity",
    needsEntity: false,
    autoApply: false,
    fields: [
      { key: "entity_name", label: "Entity name", required: true, placeholder: "e.g. Doe Family Trust" },
      { key: "entity_type", label: "Entity type", required: true, type: "select", options: ENTITY_TYPE_OPTIONS },
      { key: "loan_agreement_title", label: "Loan agreement title (if known)" },
    ],
  },
  {
    type: "other",
    label: "Other request",
    needsEntity: false,
    autoApply: false,
    fields: [],
    help: "Describe what you'd like changed.",
  },
];

export function typeDef(type: string): TypeDef | undefined {
  return CHANGE_REQUEST_TYPES.find((t) => t.type === type);
}

export function typeLabel(type: string): string {
  return typeDef(type)?.label ?? type;
}
