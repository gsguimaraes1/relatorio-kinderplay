import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseCurrency(value: string | undefined): number {
  if (!value) return 0;
  // Remove "R$ ", replace "." with "" (thousands separator), replace "," with "." (decimal)
  const cleaned = value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parsePercentage(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace("%", "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
