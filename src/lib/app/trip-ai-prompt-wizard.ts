export const tripAiPromptDateModeValues = ['with-dates', 'without-dates'] as const;
export const tripAiPromptScheduleModeValues = ['planned', 'independent'] as const;
export const tripAiPromptBudgetModeValues = ['both', 'free', 'paid'] as const;
export const tripAiPromptBookingModeValues = ['both', 'no-booking', 'booking-required'] as const;
export const tripAiPromptAccessModeValues = ['public', 'walking', 'car', 'mixed'] as const;
export const tripAiPromptTypeValues = [
  'must-see',
  'viewpoints',
  'museums',
  'walks',
  'shopping',
  'food',
  'breakfast',
  'dinner',
  'hidden-gems',
  'local-feel',
  'transport',
  'bathrooms',
] as const;

export type TripAiPromptDateMode = (typeof tripAiPromptDateModeValues)[number];
export type TripAiPromptScheduleMode = (typeof tripAiPromptScheduleModeValues)[number];
export type TripAiPromptBudgetMode = (typeof tripAiPromptBudgetModeValues)[number];
export type TripAiPromptBookingMode = (typeof tripAiPromptBookingModeValues)[number];
export type TripAiPromptAccessMode = (typeof tripAiPromptAccessModeValues)[number];
export type TripAiPromptType = (typeof tripAiPromptTypeValues)[number];

export interface TripAiPromptWizardOptions {
  place: string;
  placeLat?: number;
  placeLng?: number;
  dateMode: TripAiPromptDateMode;
  selectedDates: string[];
  scheduleMode: TripAiPromptScheduleMode;
  types: TripAiPromptType[];
  budgetMode: TripAiPromptBudgetMode;
  bookingMode: TripAiPromptBookingMode;
  accessMode: TripAiPromptAccessMode;
}
