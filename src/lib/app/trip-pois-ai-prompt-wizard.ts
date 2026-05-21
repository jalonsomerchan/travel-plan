import { tripPoiTypeValues, type TripPoiType } from '../../config/trip-pois';

export const tripPoiAiPromptTypeValues = tripPoiTypeValues;

export interface TripPoiAiPromptWizardOptions {
  place: string;
  placeLat?: number;
  placeLng?: number;
  type: TripPoiType;
}
