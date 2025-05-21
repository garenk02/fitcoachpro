import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with thousand separators
export function formatCurrency(value: number | string): string {
  // Convert to string and remove any non-digit characters except decimal point
  const numStr = String(value).replace(/[^\d.]/g, '');

  // Parse as float and ensure it's not negative
  const num = Math.max(0, parseFloat(numStr) || 0);

  // Format with thousand separators and no decimal places (IDR/Rupiah format)
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
