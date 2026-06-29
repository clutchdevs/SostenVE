import { DomainError } from '../shared/domain-error';

/**
 * RF-4.3 — PTSD (TEPT) diagnosis time block.
 *
 * A PTSD diagnosis must not be recorded before `blockDays` days have elapsed
 * since the traumatic event, in line with the international clinical framework.
 * Pure and deterministic; `blockDays` is injected by the application layer
 * (config: clinical_records.tept_diagnosis_block_days = 30).
 */

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(eventDate: Date, attemptDate: Date): number {
  return Math.floor((attemptDate.getTime() - eventDate.getTime()) / MILLISECONDS_PER_DAY);
}

export function canDiagnoseTept(
  eventDate: Date,
  attemptDate: Date,
  blockDays: number,
): boolean {
  return daysBetween(eventDate, attemptDate) >= blockDays;
}

export function assertCanDiagnoseTept(
  eventDate: Date,
  attemptDate: Date,
  blockDays: number,
): void {
  if (!canDiagnoseTept(eventDate, attemptDate, blockDays)) {
    throw new DomainError(
      `PTSD diagnosis is blocked until ${blockDays} days after the event have elapsed`,
    );
  }
}
