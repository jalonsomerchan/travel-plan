export interface TripDateRangeValidation {
  valid: boolean;
  errorKey?: string;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isInvalidTripDateRange(startDate: string | undefined, endDate: string | undefined) {
  if (!startDate || !endDate || !isIsoDate(startDate) || !isIsoDate(endDate)) {
    return false;
  }

  return endDate < startDate;
}

export function validateTripDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
): TripDateRangeValidation {
  if (isInvalidTripDateRange(startDate, endDate)) {
    return {
      valid: false,
      errorKey: 'trip.form.dateRangeError',
    };
  }

  return { valid: true };
}
