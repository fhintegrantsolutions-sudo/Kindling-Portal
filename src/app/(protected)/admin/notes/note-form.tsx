"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createNote,
  updateNote,
  type NoteFormState,
} from "@/lib/admin/note-actions";
import { addMonths, computeMonthlyPayment } from "@/lib/notes/schedule";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type NoteDefaults = {
  note_id: string;
  title: string;
  borrower_id: string | null;
  project_type: string;
  type: string;
  interest_type: string;
  is_private: boolean;
  has_profit_bonus: boolean;
  principal: string | null;
  rate: string;
  term_months: string;
  min_investment: string | null;
  target_raise: string | null;
  monthly_payment: string | null;
  contract_date: string | null;
  first_payment_date: string | null;
  maturity_date: string | null;
  funding_start_date: string | null;
  funding_end_date: string | null;
  description: string | null;
  admin_notes: string | null;
  status: string;
  client_status: string;
};

type Borrower = { id: string; business_name: string };
type Lender = { id: string; email: string; name: string | null };

type SubTab = "basics" | "terms" | "dates" | "description";

const SUB_TABS: Array<{ key: SubTab; label: string }> = [
  { key: "basics", label: "Basics" },
  { key: "terms", label: "Terms" },
  { key: "dates", label: "Dates" },
  { key: "description", label: "Description" },
];

export function NoteForm({
  noteId,
  defaults: initialDefaults,
  borrowers,
  lenders,
  visibleUserIds,
}: {
  noteId?: string;
  defaults: NoteDefaults;
  borrowers: Borrower[];
  lenders: Lender[];
  visibleUserIds: string[];
}) {
  // Capture defaults at first render so changing parent props (after a
  // server revalidation, for example) doesn't trip Base UI's "default
  // value changed" warning on uncontrolled inputs.
  const [defaults] = useState(initialDefaults);
  const action = noteId ? updateNote.bind(null, noteId) : createNote;
  const [state, formAction, pending] = useActionState<
    NoteFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const [isPrivate, setIsPrivate] = useState(defaults.is_private);
  const [search, setSearch] = useState("");
  const [interestType, setInterestType] = useState(defaults.interest_type);
  // Supabase numeric/integer columns can come back as either strings or
  // numbers depending on the driver — coerce to string so .replace() and
  // friends are safe.
  const [principalStr, setPrincipalStr] = useState(
    defaults.principal == null ? "" : formatMoney(String(defaults.principal)),
  );
  const [rateStr, setRateStr] = useState(
    defaults.rate == null ? "" : String(defaults.rate),
  );
  const [termStr, setTermStr] = useState(
    defaults.term_months == null ? "" : String(defaults.term_months),
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    defaults.first_payment_date ?? "",
  );
  const [fundingStart, setFundingStart] = useState(
    defaults.funding_start_date ?? "",
  );
  const [fundingEnd, setFundingEnd] = useState(
    defaults.funding_end_date ?? "",
  );
  const [contractDate, setContractDate] = useState(
    defaults.contract_date ?? "",
  );
  const [hasProfitBonus, setHasProfitBonus] = useState(
    defaults.has_profit_bonus,
  );
  const [subTab, setSubTab] = useState<SubTab>("basics");

  const maturityDate = useMemo(() => {
    if (!firstPaymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate))
      return null;
    const term = parseInt(termStr, 10);
    if (!Number.isInteger(term) || term <= 0) return null;
    return addMonths(firstPaymentDate, term - 1);
  }, [firstPaymentDate, termStr]);

  const monthlyPayment = useMemo(() => {
    const cleanPrincipal = principalStr.replace(/,/g, "");
    return computeMonthlyPayment({
      principal: cleanPrincipal === "" ? null : Number(cleanPrincipal),
      annualRatePct: rateStr === "" ? null : Number(rateStr),
      termMonths: termStr === "" ? null : parseInt(termStr, 10),
      interestType,
    });
  }, [principalStr, rateStr, termStr, interestType]);

  // Sort lenders by name (with email fallback) so the list is scannable.
  const sortedLenders = [...lenders].sort((a, b) => {
    const an = (a.name ?? a.email).toLowerCase();
    const bn = (b.name ?? b.email).toLowerCase();
    return an.localeCompare(bn);
  });
  const visibleSet = new Set(visibleUserIds);

  const lc = search.trim().toLowerCase();
  const lenderMatches = (l: Lender): boolean => {
    if (!lc) return true;
    return (
      (l.name ?? "").toLowerCase().includes(lc) ||
      l.email.toLowerCase().includes(lc)
    );
  };
  const visibleCount = sortedLenders.filter(lenderMatches).length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1 border-b">
        {SUB_TABS.map((t) => {
          const active = subTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubTab(t.key)}
              className={
                "border-b-2 px-3 py-2 text-sm transition-colors -mb-px " +
                (active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <TabPanel active={subTab === "basics"}>
      <Section title="Identification">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="note_id"
            label="Note ID"
            placeholder="K26003"
            defaultValue={defaults.note_id}
            error={fe.note_id}
            required
          />
          <Field
            name="title"
            label="Title"
            placeholder="Austin Multi-Family Fund III"
            defaultValue={defaults.title}
            error={fe.title}
          />
        </div>
      </Section>

      <Section title="Borrower">
        <div className="flex flex-col gap-2">
          <Label htmlFor="borrower_id">Borrower</Label>
          <select
            id="borrower_id"
            name="borrower_id"
            defaultValue={defaults.borrower_id ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">— none —</option>
            {borrowers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.business_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Add a borrower from{" "}
            <a
              href="/admin/borrowers/new"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Borrowers
            </a>{" "}
            if the one you need isn&apos;t in the list.
          </p>
        </div>
      </Section>

      <Section title="Investment limits">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="min_investment"
            label="Minimum investment (USD)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.min_investment}
          />
          <Field
            name="target_raise"
            label="Target raise (USD)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.target_raise}
          />
        </div>
      </Section>

      <Section title="Status">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={defaults.status}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Funded">Funded</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client_status">Client status (lender-visible)</Label>
            <select
              id="client_status"
              name="client_status"
              defaultValue={defaults.client_status}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="Available">Available</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Visibility">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="is_private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Private to specific lenders.</span>{" "}
            When checked, only the lenders ticked below will see this note
            on /opportunities. Existing participants always see notes
            they&apos;ve invested in, regardless of this setting.
          </span>
        </label>

        <div className={isPrivate ? "flex flex-col gap-2" : "hidden"}>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="lender-search">
              Lenders who can see this note
            </Label>
            <span className="text-xs text-muted-foreground">
              {sortedLenders.length} total
            </span>
          </div>

          {sortedLenders.length === 0 ? (
            <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              No lenders in the system yet.
            </p>
          ) : (
            <>
              <Input
                id="lender-search"
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border bg-background p-2">
                {sortedLenders.map((l) => (
                  <label
                    key={l.id}
                    className={
                      lenderMatches(l)
                        ? "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/40"
                        : "hidden"
                    }
                  >
                    <input
                      type="checkbox"
                      name="visible_user_ids"
                      value={l.id}
                      defaultChecked={visibleSet.has(l.id)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">{l.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {l.email}
                      </span>
                    </span>
                  </label>
                ))}
                {visibleCount === 0 ? (
                  <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                    No lenders match &ldquo;{search}&rdquo;.
                  </p>
                ) : null}
              </div>
              {lc ? (
                <p className="text-xs text-muted-foreground">
                  Showing {visibleCount} of {sortedLenders.length}. Selections
                  outside the current filter are preserved on save.
                </p>
              ) : null}
            </>
          )}
        </div>
      </Section>

      <Section title="Profit bonus">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="has_profit_bonus"
            checked={hasProfitBonus}
            onChange={(e) => setHasProfitBonus(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">This note has a profit bonus.</span>{" "}
            When unchecked, the &ldquo;Profit bonuses&rdquo; section is hidden
            from lenders on their note page. Turn this on to show it.
          </span>
        </label>
      </Section>
      </TabPanel>

      <TabPanel active={subTab === "terms"}>
      <Section title="Loan terms">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="project_type"
            label="Project type"
            placeholder="real_estate"
            defaultValue={defaults.project_type}
            error={fe.project_type}
            required
          />
          <Field
            name="type"
            label="Type"
            placeholder="note"
            defaultValue={defaults.type}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="interest_type">Interest type</Label>
            <select
              id="interest_type"
              name="interest_type"
              value={interestType}
              onChange={(e) => setInterestType(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="Amortized">Amortized</option>
              <option value="Interest only">Interest only</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="principal">Principal (USD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="principal"
                name="principal"
                type="text"
                inputMode="decimal"
                value={principalStr}
                onChange={(e) => {
                  // Allow digits, comma, and one decimal point.
                  const next = e.target.value.replace(/[^0-9.,]/g, "");
                  setPrincipalStr(next);
                }}
                onBlur={() => setPrincipalStr((s) => formatMoney(s))}
                className="pl-7"
                aria-invalid={Boolean(fe.principal) || undefined}
              />
            </div>
            {fe.principal ? (
              <p className="text-xs text-destructive">{fe.principal}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rate">Rate (%) *</Label>
            <Input
              id="rate"
              name="rate"
              type="number"
              step="0.01"
              min="0"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              aria-invalid={Boolean(fe.rate) || undefined}
            />
            {fe.rate ? (
              <p className="text-xs text-destructive">{fe.rate}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="term_months">Term (months) *</Label>
            <Input
              id="term_months"
              name="term_months"
              type="number"
              step="1"
              min="1"
              value={termStr}
              onChange={(e) => setTermStr(e.target.value)}
              aria-invalid={Boolean(fe.term_months) || undefined}
            />
            {fe.term_months ? (
              <p className="text-xs text-destructive">{fe.term_months}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Monthly payment</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
              {monthlyPayment !== null ? (
                <span className="font-medium">
                  {monthlyPayment.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Set principal, rate, and term to compute
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>
      </TabPanel>

      <TabPanel active={subTab === "dates"}>
      <Section title="Dates">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="funding_start_date">Funding open</Label>
            <Input
              id="funding_start_date"
              name="funding_start_date"
              type="date"
              value={fundingStart}
              onChange={(e) => setFundingStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="funding_end_date">Funding closes</Label>
            <Input
              id="funding_end_date"
              name="funding_end_date"
              type="date"
              value={fundingEnd}
              onChange={(e) => setFundingEnd(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contract_date">Contract date</Label>
            <Input
              id="contract_date"
              name="contract_date"
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="first_payment_date">First payment date</Label>
            <Input
              id="first_payment_date"
              name="first_payment_date"
              type="date"
              value={firstPaymentDate}
              onChange={(e) => setFirstPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Maturity date</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
              {maturityDate ? (
                <span className="font-medium">{formatDate(maturityDate)}</span>
              ) : (
                <span className="text-muted-foreground">
                  Set first payment date and term to compute
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>
      </TabPanel>

      <TabPanel active={subTab === "description"}>
      <Section title="Description">
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description (lender-visible)</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={defaults.description ?? undefined}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin_notes">Admin notes (internal)</Label>
          <textarea
            id="admin_notes"
            name="admin_notes"
            rows={3}
            defaultValue={defaults.admin_notes ?? undefined}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
        </div>
      </Section>
      </TabPanel>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : noteId
              ? "Save changes"
              : "Create note"}
        </Button>
      </div>
    </form>
  );
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  // Use `hidden` rather than conditional render so all inputs stay in the
  // DOM and submit together with one click of the Save button.
  return <div className={active ? "flex flex-col gap-8" : "hidden"}>{children}</div>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  error,
  step,
  min,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  error?: string;
  step?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        step={step}
        min={min}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// Format a numeric string as "1,234,567.89" (thousands separators, two
// decimals). Leaves an empty or non-numeric value untouched so the field can
// still be cleared or edited freely; commas are stripped again on submit.
function formatMoney(value: string): string {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
