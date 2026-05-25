import type { User } from 'firebase/auth';
import type { TripAccommodationRecord, TripRecord } from '../app/models';
import { getFirebasePublicConfig } from './config';

type FirestoreValue = {
  stringValue?: string;
  doubleValue?: number;
  integerValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: FirestoreFields };
};

type FirestoreFields = Record<string, FirestoreValue>;

type RunQueryDocument = {
  name?: string;
  fields?: FirestoreFields;
};

type RunQueryResponseItem = {
  document?: RunQueryDocument;
};

function getString(fields: FirestoreFields, key: string) {
  return fields[key]?.stringValue ?? '';
}

function getNumber(fields: FirestoreFields, key: string) {
  const value = fields[key];

  if (!value) {
    return undefined;
  }

  if (typeof value.doubleValue === 'number') {
    return value.doubleValue;
  }

  if (value.integerValue !== undefined) {
    return Number(value.integerValue);
  }

  return undefined;
}

function getStringArray(fields: FirestoreFields, key: string) {
  return fields[key]?.arrayValue?.values?.map((value) => value.stringValue ?? '').filter(Boolean) ?? [];
}

function getAccommodation(fields: FirestoreFields): TripAccommodationRecord | undefined {
  const accommodation = fields.accommodation?.mapValue?.fields;

  if (!accommodation) {
    return undefined;
  }

  const name = getString(accommodation, 'name').trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    locationName: getString(accommodation, 'locationName') || undefined,
    locationLat: getNumber(accommodation, 'locationLat'),
    locationLng: getNumber(accommodation, 'locationLng'),
  };
}

function getDocumentId(name: string) {
  return name.split('/').pop() ?? '';
}

function isDeleted(fields: FirestoreFields) {
  return Boolean(fields.deletedAt);
}

function mapDocumentToTrip(document: RunQueryDocument): TripRecord | null {
  const fields = document.fields;
  const id = document.name ? getDocumentId(document.name) : '';

  if (!id || !fields || isDeleted(fields)) {
    return null;
  }

  return {
    id,
    name: getString(fields, 'name'),
    location: getString(fields, 'location'),
    locationLat: getNumber(fields, 'locationLat'),
    locationLng: getNumber(fields, 'locationLng'),
    startDate: getString(fields, 'startDate'),
    endDate: getString(fields, 'endDate'),
    status: (getString(fields, 'status') as TripRecord['status']) || 'idea',
    accommodation: getAccommodation(fields),
    parentTripId: getString(fields, 'parentTripId') || undefined,
    ownerId: getString(fields, 'ownerId'),
    ownerEmail: getString(fields, 'ownerEmail'),
    memberIds: getStringArray(fields, 'memberIds'),
  };
}

function sortTrips(trips: TripRecord[]) {
  return [...trips].sort((left, right) =>
    `${left.startDate || '9999-99-99'}${left.name}`.localeCompare(`${right.startDate || '9999-99-99'}${right.name}`),
  );
}

function mergeTrips(tripGroups: TripRecord[][]) {
  const tripsById = new Map<string, TripRecord>();

  tripGroups.flat().forEach((trip) => tripsById.set(trip.id, trip));

  return sortTrips([...tripsById.values()]);
}

async function runTripsQuery(user: User, fieldPath: 'memberIds' | 'ownerId') {
  const { projectId } = getFirebasePublicConfig();

  if (!projectId) {
    throw new Error('Firebase projectId missing');
  }

  const token = await user.getIdToken();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'trips' }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: fieldPath === 'memberIds' ? 'ARRAY_CONTAINS' : 'EQUAL',
            value: { stringValue: user.uid },
          },
        },
      },
    }),
  });

  const data = (await response.json()) as RunQueryResponseItem[] | { error?: { message?: string } };

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(!Array.isArray(data) ? data.error?.message || response.statusText : response.statusText);
  }

  return data
    .map((item) => (item.document ? mapDocumentToTrip(item.document) : null))
    .filter((trip): trip is TripRecord => Boolean(trip));
}

export async function fetchUserTripsDirect(user: User) {
  const [memberTrips, ownedTrips] = await Promise.all([runTripsQuery(user, 'memberIds'), runTripsQuery(user, 'ownerId')]);

  return mergeTrips([memberTrips, ownedTrips]);
}
