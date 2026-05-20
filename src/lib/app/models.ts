export const tripStatusValues = ['idea', 'planned', 'booked', 'visited'] as const;
export const tripMemberRoles = ['viewer', 'editor'] as const;
export const planCategoryValues = [
  'visit',
  'food',
  'stay',
  'transport',
  'museum',
  'shop',
  'bathroom',
  'other',
] as const;
export const planStatusValues = ['proposed', 'pending', 'visited', 'discarded'] as const;
export const checklistItemStatusValues = ['pending', 'completed'] as const;

export type TripStatus = (typeof tripStatusValues)[number];
export type TripMemberRole = (typeof tripMemberRoles)[number];
export type PlanCategory = (typeof planCategoryValues)[number];
export type PlanStatus = (typeof planStatusValues)[number];
export type ChecklistItemStatus = (typeof checklistItemStatusValues)[number];

export interface TripAccommodationRecord {
  name: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface TripRecord {
  id: string;
  name: string;
  location: string;
  locationLat?: number;
  locationLng?: number;
  startDate: string;
  endDate: string;
  status: TripStatus;
  accommodation?: TripAccommodationRecord;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
}

export interface TripInput {
  name: string;
  location: string;
  locationLat?: number;
  locationLng?: number;
  startDate: string;
  endDate: string;
  status: TripStatus;
  accommodation?: TripAccommodationRecord;
}

export interface TripMemberRecord {
  id: string;
  userId?: string;
  email: string;
  role: TripMemberRole;
}

export interface TripInviteRecord {
  id: string;
  tripId: string;
  tripName: string;
  tripLocation: string;
  tripStartDate: string;
  tripEndDate: string;
  ownerId: string;
  ownerEmail: string;
  email: string;
  emailLower: string;
  role: TripMemberRole;
  status: 'pending' | 'accepted';
}

export interface PlanLinkRecord {
  label: string;
  url: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  category: PlanCategory;
  isPaid: boolean;
  isBooked: boolean;
  isOptional: boolean;
  isImportant: boolean;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  date?: string;
  time?: string;
  status: PlanStatus;
  links: PlanLinkRecord[];
}

export interface PlanInput {
  name: string;
  description: string;
  category: PlanCategory;
  isPaid: boolean;
  isBooked: boolean;
  isOptional: boolean;
  isImportant: boolean;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  date?: string;
  time?: string;
  status: PlanStatus;
  links?: PlanLinkRecord[];
}

export interface ChecklistItemRecord {
  id: string;
  title: string;
  status: ChecklistItemStatus;
}

export interface ChecklistItemInput {
  title: string;
  status: ChecklistItemStatus;
}

export interface TripPointOfInterestRecord {
  id: string;
  name: string;
  icon: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
}

export interface TripPointOfInterestInput {
  name: string;
  icon: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
}
