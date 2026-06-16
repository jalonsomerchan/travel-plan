import type { TripPoiType } from '../../config/trip-pois';

export const tripStatusValues = ['idea', 'planned', 'booked', 'visited'] as const;
export const tripMemberRoles = ['viewer', 'editor'] as const;
export const planCategoryValues = [
  'visit',
  'viewpoint',
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

export interface TripChildSummaryRecord {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
}

export interface PlanLinkRecord {
  label: string;
  url: string;
}

export interface DestinationLinkRecord {
  id: string;
  title: string;
  url: string;
  category?: string;
  notes?: string;
}

export interface DestinationLinkInput {
  title: string;
  url: string;
  category?: string;
  notes?: string;
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
  parentTripId?: string;
  childTrips: TripChildSummaryRecord[];
  destinationLinks: DestinationLinkRecord[];
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
  parentTripId?: string;
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
  status: 'pending' | 'accepted' | 'deleted';
}

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  category: PlanCategory;
  isPaid: boolean;
  isBooked: boolean;
  needsReservation: boolean;
  isOptional: boolean;
  isImportant: boolean;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  date?: string;
  time?: string;
  dayOrder?: number;
  status: PlanStatus;
  links: PlanLinkRecord[];
  aiGuide?: string;
}

export interface PlanInput {
  name: string;
  description: string;
  category: PlanCategory;
  isPaid: boolean;
  isBooked: boolean;
  needsReservation: boolean;
  isOptional: boolean;
  isImportant: boolean;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  date?: string;
  time?: string;
  dayOrder?: number;
  status: PlanStatus;
  links: PlanLinkRecord[];
  aiGuide?: string;
}

export interface ChecklistItemRecord {
  id: string;
  title: string;
  status: ChecklistItemStatus;
  createdAt?: unknown;
}

export interface ChecklistItemInput {
  title: string;
  status: ChecklistItemStatus;
}

export interface TripPoiRecord {
  id: string;
  name: string;
  description: string;
  type: TripPoiType;
  icon: string;
  color: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  isVisible: boolean;
  isSystem?: boolean;
}

export interface TripPoiInput {
  name: string;
  description: string;
  type: TripPoiType;
  icon: string;
  color: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  isVisible: boolean;
  isSystem?: boolean;
}

export interface LuggageItemRecord {
  id: string;
  name: string;
  quantity: number;
  isPacked: boolean;
  ownerId: string;
}

export interface LuggageItemInput {
  name: string;
  quantity: number;
  isPacked: boolean;
}
