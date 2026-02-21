import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// tailwind class merge helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
