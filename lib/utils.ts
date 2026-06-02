// shadcn-style `cn` helper. Even though this project doesn't use Tailwind,
// the helper still works — `clsx` joins truthy class strings, `twMerge`
// dedupes conflicting Tailwind classes (no-op if no Tailwind class is
// present). New components that follow the shadcn convention can import
// from "@/lib/utils".

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
