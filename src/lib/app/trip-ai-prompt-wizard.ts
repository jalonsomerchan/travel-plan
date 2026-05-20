export const tripAiPromptDateModeValues = ['scheduled', 'unscheduled'] as const;
export const tripAiPromptPlanModeValues = ['itinerary', 'independent'] as const;
export const tripAiPromptTourismStyleValues = ['balanced', 'touristic', 'local'] as const;
export const tripAiPromptBudgetModeValues = ['both', 'free', 'paid'] as const;
export const tripAiPromptAccessModeValues = ['public', 'walking', 'car', 'mixed'] as const;

export type TripAiPromptDateMode = (typeof tripAiPromptDateModeValues)[number];
export type TripAiPromptPlanMode = (typeof tripAiPromptPlanModeValues)[number];
export type TripAiPromptTourismStyle = (typeof tripAiPromptTourismStyleValues)[number];
export type TripAiPromptBudgetMode = (typeof tripAiPromptBudgetModeValues)[number];
export type TripAiPromptAccessMode = (typeof tripAiPromptAccessModeValues)[number];

export interface TripAiPromptWizardOptions {
  place: string;
  dateMode: TripAiPromptDateMode;
  startDate?: string;
  endDate?: string;
  planMode: TripAiPromptPlanMode;
  types: string[];
  tourismStyle: TripAiPromptTourismStyle;
  budgetMode: TripAiPromptBudgetMode;
  accessMode: TripAiPromptAccessMode;
}
