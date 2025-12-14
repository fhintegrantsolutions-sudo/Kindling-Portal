import { useQuery } from "@tanstack/react-query";
import type { Note, Participation, Beneficiary, Document } from "@shared/schema";

export type ParticipationWithNote = Participation & { note: Note };

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
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
