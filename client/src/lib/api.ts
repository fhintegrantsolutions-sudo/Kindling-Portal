import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note, Participation, Beneficiary, Document, Payment, ParticipationDocument, Activity, NoteRegistration } from "@shared/schema";

export type ParticipationWithNote = Participation & { note: Note };
export type RegistrationWithNote = NoteRegistration & { note: Note | null };

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

async function patchJSON<T>(url: string, data: any): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to patch ${url}`);
  }
  return response.json();
}

export function useActiveNotes() {
  return useQuery<Note[]>({
    queryKey: ["notes", "active"],
    queryFn: () => fetchJSON("/api/notes/active"),
  });
}

export function useMyParticipations() {
  return useQuery<ParticipationWithNote[]>({
    queryKey: ["my-participations"],
    queryFn: () => fetchJSON("/api/my-participations"),
  });
}

export function useMyRegistrations() {
  return useQuery<RegistrationWithNote[]>({
    queryKey: ["my-registrations"],
    queryFn: () => fetchJSON("/api/my-registrations"),
  });
}

export function useCurrentUser() {
  return useQuery<{
    id: string;
    username: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    entityType?: string | null;
    loanAgreementTitle?: string | null;
  } | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await fetch("/api/me", { credentials: "include" });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useMyBeneficiaries() {
  return useQuery<Beneficiary[]>({
    queryKey: ["my-beneficiaries"],
    queryFn: () => fetchJSON("/api/my-beneficiaries"),
  });
}

export function useMyDocuments() {
  return useQuery<Document[]>({
    queryKey: ["my-documents"],
    queryFn: () => fetchJSON("/api/my-documents"),
  });
}

export function useMyEntity() {
  return useQuery<{
    entity: {
      id: string;
      entityType: "individual" | "llc" | "corporation" | "trust" | "partnership";
      legalName: string;
      taxId?: string;
      formationDate?: Date | string;
      formationState?: string;
      kycStatus: "pending" | "verified" | "rejected" | "expired";
      accreditedInvestor: boolean;
      status: "active" | "suspended" | "closed";
    } | null;
    entityCount: number;
    relationship?: string;
    lender?: any;
  }>({
    queryKey: ["my-entity"],
    queryFn: async () => {
      const user = await fetchJSON<{ id: string }>("/api/me");
      return fetchJSON(`/api/admin/users/${user.id}/entity`);
    },
  });
}

export function useOpportunities() {
  return useQuery<Note[]>({
    queryKey: ["notes", "opportunities"],
    queryFn: () => fetchJSON("/api/notes/opportunities"),
  });
}

export function useUserParticipations(userId: string) {
  return useQuery<ParticipationWithNote[]>({
    queryKey: ["participations", userId],
    queryFn: () => fetchJSON(`/api/participations/user/${userId}`),
    enabled: !!userId,
  });
}

export function useUserBeneficiaries(userId: string) {
  return useQuery<Beneficiary[]>({
    queryKey: ["beneficiaries", userId],
    queryFn: () => fetchJSON(`/api/beneficiaries/user/${userId}`),
    enabled: !!userId,
  });
}

export function useUserDocuments(userId: string) {
  return useQuery<Document[]>({
    queryKey: ["documents", userId],
    queryFn: () => fetchJSON(`/api/documents/user/${userId}`),
    enabled: !!userId,
  });
}

export function useUserEntity(userId: string) {
  return useQuery<{
    entity: {
      id: string;
      entityType: "individual" | "llc" | "corporation" | "trust" | "partnership";
      legalName: string;
      taxId?: string;
      formationDate?: Date | string;
      formationState?: string;
      kycStatus: "pending" | "verified" | "rejected" | "expired";
      accreditedInvestor: boolean;
      status: "active" | "suspended" | "closed";
    } | null;
    entityCount: number;
    relationship?: string;
    lender?: any;
  }>({
    queryKey: ["user-entity", userId],
    queryFn: () => fetchJSON(`/api/admin/users/${userId}/entity`),
    enabled: !!userId,
  });
}

export function useParticipation(id: string) {
  return useQuery<ParticipationWithNote>({
    queryKey: ["participation", id],
    queryFn: () => fetchJSON(`/api/participations/${id}`),
    enabled: !!id,
  });
}

export function useParticipationPayments(participationId: string) {
  return useQuery<Payment[]>({
    queryKey: ["participation-payments", participationId],
    queryFn: () => fetchJSON(`/api/participations/${participationId}/payments`),
    enabled: !!participationId,
  });
}

export function useParticipationDocuments(participationId: string) {
  return useQuery<ParticipationDocument[]>({
    queryKey: ["participation-documents", participationId],
    queryFn: () => fetchJSON(`/api/participations/${participationId}/documents`),
    enabled: !!participationId,
  });
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatCurrencyPrecise(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatRate(rate: string | number): string {
  const num = typeof rate === "string" ? parseFloat(rate) : rate;
  return `${num.toFixed(2)}%`;
}

export function formatTerm(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} Year${years > 1 ? "s" : ""}`;
    }
    return `${years}y ${remainingMonths}m`;
  }
  return `${months} Months`;
}

export function useMyActivities(limit: number = 10) {
  return useQuery<Activity[]>({
    queryKey: ["my-activities", limit],
    queryFn: () => fetchJSON(`/api/my-activities?limit=${limit}`),
  });
}

export function useUpdateParticipationNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ participationId, userNotes }: { participationId: string; userNotes: string }) =>
      patchJSON(`/api/participations/${participationId}/notes`, { userNotes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["participation", variables.participationId] });
      queryClient.invalidateQueries({ queryKey: ["my-participations"] });
    },
  });
}
