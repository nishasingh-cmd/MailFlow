import { type ClassValue, clsx } from 'clsx';

/**
 * cn() — Merge Tailwind class names safely, handling conditional classes.
 * Combines clsx for conditional logic.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
