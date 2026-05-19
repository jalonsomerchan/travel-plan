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
export const planStatusValues = ['pending', 'visited', 'discarded'] as const;

export type TripStatus = (typeof tripStatusValues)[number];
export type TripMemberRole = (typeof tripMemberRoles)[number];
export type PlanCategory = (typeof planCategoryValues)[number];
export type PlanStatus = (typeof planStatusValues)[number];

export interface TripRecord {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
}

export interface TripInput {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
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

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  category: PlanCategory;
  date?: string;
  time?: string;
  status: PlanStatus;
}

export interface PlanInput {
  name: string;
  description: string;
  category: PlanCategory;
  date?: string;
  time?: string;
  status: PlanStatus;
}
