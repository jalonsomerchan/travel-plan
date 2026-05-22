import type { PlanInput, TripRecord } from './models';

function isIsoDate(value: string | undefined) {
  return Boolean(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export interface PlanDateValidation {
  valid: boolean;
  errorKey?: string;
}

export function isSingleDayTrip(trip: Pick<TripRecord, 'startDate' | 'endDate'>) {
  return isIsoDate(trip.startDate) && trip.startDate === trip.endDate;
}

export function getForcedPlanDateForTrip(trip: Pick<TripRecord, 'startDate' | 'endDate'>) {
  return isSingleDayTrip(trip) ? trip.startDate : undefined;
}

export function normalizePlanInputForTrip(
  input: PlanInput,
  trip: Pick<TripRecord, 'startDate' | 'endDate'>,
): PlanInput {
  const forcedDate = getForcedPlanDateForTrip(trip);

  if (!forcedDate) {
    return input;
  }

  return {
    ...input,
    date: forcedDate,
  };
}

export function validatePlanDateForTrip(
  date: string | undefined,
  trip: Pick<TripRecord, 'parentTripId'>,
  parentTrip?: Pick<TripRecord, 'startDate' | 'endDate'> | null,
): PlanDateValidation {
  if (!date) {
    return { valid: true };
  }

  if (!trip.parentTripId || !parentTrip) {
    return { valid: true };
  }

  if (!isIsoDate(parentTrip.startDate) || !isIsoDate(parentTrip.endDate)) {
    return { valid: true };
  }

  if (date < parentTrip.startDate || date > parentTrip.endDate) {
    return {
      valid: false,
      errorKey: 'plan.form.dateOutsideParentTripRange',
    };
  }

  return { valid: true };
}
