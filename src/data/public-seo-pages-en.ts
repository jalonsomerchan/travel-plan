import type { PublicPageContent } from './public-page-types';
import type { PublicSeoPageId } from './public-seo-pages';

export const publicSeoPagesEn: Record<PublicSeoPageId, PublicPageContent<PublicSeoPageId>> = {
  'organizador-viajes-grupo': {
    id: 'organizador-viajes-grupo',
    label: 'Group trip organizer',
    slug: 'group-trip-organizer',
    eyebrow: 'Trips with several people',
    title: 'Online group trip organizer',
    description: 'Organize group trips with shared plans, maps, calendar, accommodation, checklist and editing permissions from one lightweight web app.',
    intro: 'TravelPlan helps prepare a group trip without losing information between chats, scattered notes, saved maps and personal lists.',
    sections: [
      {
        title: 'One web app for the whole group',
        body: 'Each trip can bring together destination, dates, accommodation, plans, points of interest and pending tasks so everyone sees the same updated information.',
        items: ['Shared trips with permissions.', 'Plans with status, date and location.', 'Map and calendar connected to the itinerary.'],
      },
      {
        title: 'Less chaos in chats and spreadsheets',
        body: 'When each person suggests restaurants, visits or excursions in different places, deciding becomes slow. TravelPlan centralizes those ideas so they can be reviewed by day, status or location.',
      },
      {
        title: 'Ready for real getaways',
        body: 'You can save unscheduled plans, move them later, mark accommodation and use checklist or luggage sections to prepare details before leaving.',
      },
    ],
  },
  'planificador-itinerarios': {
    id: 'planificador-itinerarios',
    label: 'Itinerary planner',
    slug: 'itinerary-planner',
    eyebrow: 'Clear itineraries',
    title: 'Travel itinerary planner with calendar and map',
    description: 'Create day-by-day travel itineraries with plans, times, locations, maps and collaboration to organize every getaway better.',
    intro: 'A good itinerary is not just a list of places: it also needs dates, order, context, location and room for changes.',
    sections: [
      {
        title: 'Organize plans by date and status',
        body: 'TravelPlan lets you save pending ideas, proposed plans and decided activities so the itinerary can grow step by step.',
        items: ['Trip plan list.', 'Calendar to review dates.', 'Statuses to separate ideas from confirmed plans.'],
      },
      {
        title: 'Combine map and agenda',
        body: 'Plans with location can be reviewed on the map to understand which areas should be grouped and which visits are far away.',
      },
      {
        title: 'Flexible until the last minute',
        body: 'If weather, schedule or group preferences change, you can move plans and keep an updated view of the trip.',
      },
    ],
  },
  'app-mapas-viaje': {
    id: 'app-mapas-viaje',
    label: 'Travel maps',
    slug: 'travel-map-app',
    eyebrow: 'Maps and itineraries',
    title: 'Map app for organizing travel plans',
    description: 'Save plans with location and review the trip on a shared map with accommodation, points of interest and itinerary activities.',
    intro: 'A travel map is more than a set of pins: it helps decide areas, avoid awkward routes and find nearby plans.',
    sections: [
      {
        title: 'All important places together',
        body: 'TravelPlan can show accommodation, plans and points of interest in a map view designed for trip planning.',
        items: ['Accommodation as reference.', 'Plans with marker and detail.', 'Points of interest saved for the trip.'],
      },
      {
        title: 'Filters to keep the map readable',
        body: 'When there are many plans, filters help decide which layers to see and what to focus on at each moment.',
      },
      {
        title: 'Great for city routes',
        body: 'In cities with many visits, restaurants and viewpoints, seeing everything on the map makes it easier to group areas and prepare smoother days.',
      },
    ],
  },
  'checklist-equipaje-viaje': {
    id: 'checklist-equipaje-viaje',
    label: 'Checklist and packing',
    slug: 'travel-checklist-packing-list',
    eyebrow: 'Trip preparation',
    title: 'Shared travel checklist and packing list',
    description: 'Prepare your trip with checklist, pending tasks and packing list so documents, bookings and important items are not forgotten.',
    intro: 'Before every trip there are small tasks: reviewing documents, packing, confirming times, saving links or remembering accommodation details.',
    sections: [
      {
        title: 'Checklist per trip',
        body: 'Each trip can have its own task list to share preparation and review what is missing before leaving.',
        items: ['Pending and completed tasks.', 'Practical notes per trip.', 'Preparation visible to the group.'],
      },
      {
        title: 'Packing separated from plans',
        body: 'The packing list avoids mixing personal items with visits or bookings, keeping each thing in the right place.',
      },
      {
        title: 'More peace of mind before leaving',
        body: 'Clear preparation reduces forgotten items and helps reach the first day of the trip with less rush.',
      },
    ],
  },
  'calendario-viaje-compartido': {
    id: 'calendario-viaje-compartido',
    label: 'Shared trip calendar',
    slug: 'shared-trip-calendar',
    eyebrow: 'Dates and plans',
    title: 'Shared trip calendar for organizing plans',
    description: 'View trip plans in a calendar, spread activities across days and share the itinerary with other people.',
    intro: 'A shared trip calendar helps check whether a day is too packed, whether there are gaps or whether some plans still need a date.',
    sections: [
      {
        title: 'Plans grouped by day',
        body: 'TravelPlan makes it easy to review dates and activities from a clear view so the group understands what happens each day.',
        items: ['Dated plans.', 'Activities still pending a day.', 'Quick access to plan detail.'],
      },
      {
        title: 'Useful before and during the trip',
        body: 'Before leaving it helps organize the itinerary; during the trip it helps check what comes next without searching old conversations.',
      },
      {
        title: 'Connected with maps and checklist',
        body: 'The calendar is not isolated: it works together with location, accommodation, points of interest and trip preparation.',
      },
    ],
  },
  'planificar-escapada-fin-semana': {
    id: 'planificar-escapada-fin-semana',
    label: 'Weekend getaways',
    slug: 'weekend-getaway-planner',
    eyebrow: 'Short getaways',
    title: 'How to plan a weekend getaway',
    description: 'Organize a weekend getaway with day-by-day plans, accommodation, map, checklist and collaboration with travel companions.',
    intro: 'Short getaways need lightweight planning: few days, quick decisions and a simple way to avoid forgetting bookings or important places.',
    sections: [
      {
        title: 'Start with dates and accommodation',
        body: 'Creating the trip with destination, dates and accommodation makes the rest of the sections work as a shared base for the getaway.',
      },
      {
        title: 'Save ideas before deciding everything',
        body: 'You can add restaurants, viewpoints, visits or walks as pending plans and decide later what fits best each day.',
        items: ['Quick ideas.', 'Plans with location.', 'Checklist to prepare departure.'],
      },
      {
        title: 'Share the plan with your companions',
        body: 'On a getaway with a partner, friends or family, everyone can check the updated itinerary without relying on old screenshots.',
      },
    ],
  },
  'organizar-viaje-amigos': {
    id: 'organizar-viaje-amigos',
    label: 'Trips with friends',
    slug: 'plan-a-trip-with-friends',
    eyebrow: 'Plans with friends',
    title: 'How to organize a trip with friends without chaos',
    description: 'Centralize ideas, maps, calendar, accommodation and checklist to organize a trip with friends from a collaborative web app.',
    intro: 'A trip with friends usually starts with many ideas and ends with scattered information. TravelPlan helps turn those suggestions into a shared itinerary.',
    sections: [
      {
        title: 'One place for every suggestion',
        body: 'Each person can contribute plan ideas, restaurants or visits, and the group can review them inside the same trip.',
      },
      {
        title: 'Clearer decisions',
        body: 'Plan statuses help separate what is proposed, what is pending and what has already been done, avoiding confusion as the trip grows.',
        items: ['Group suggestions.', 'Pending plans.', 'Completed activities.'],
      },
      {
        title: 'Practical information always available',
        body: 'Accommodation, maps, links, checklist and luggage stay next to the itinerary so each detail does not have to be searched in a different chat.',
      },
    ],
  },
  'viaje-colaborativo-online': {
    id: 'viaje-colaborativo-online',
    label: 'Collaborative travel planning',
    slug: 'collaborative-travel-planning',
    eyebrow: 'Online collaboration',
    title: 'Collaborative travel planning online',
    description: 'Plan trips online collaboratively with members, permissions, shared plans, calendar, map and preparation tasks.',
    intro: 'Collaborative planning helps a trip stop depending on one person and become a shared space for the whole group.',
    sections: [
      {
        title: 'Roles and permissions for collaboration',
        body: 'TravelPlan is designed so several people can check or edit trip information according to their permissions.',
      },
      {
        title: 'A living base for the itinerary',
        body: 'The trip can be updated when dates, plans, locations or group decisions change, keeping one shared reference.',
        items: ['Shared trips.', 'Collaborative editing.', 'Synchronized information.'],
      },
      {
        title: 'From idea to prepared trip',
        body: 'You can start with a list of ideas and end with calendar, map, accommodation, checklist and luggage ready for travel.',
      },
    ],
  },
};
