import type { AuraReading } from './aura';

export interface SavedReading extends AuraReading {
  note?: string;
  yearTag?: number;
}
