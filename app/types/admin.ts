/**
 * What the API's admin desk sends back (backend: admin/web/AdminController). Kept by hand: the
 * admin app shares the API with the player app but none of its code.
 */
export type ID = string
export type ISODate = string

/** A PlayChale person's role. Nobody can grant the first one through any app. */
export type StaffRole = 'support' | 'owner'

/** The signed-in person, as much of the API's User as the desk needs. */
export interface SignedIn {
  id: ID
  name: string
  email?: string
}

/** Someone as the desk sees them: enough to recognise them, not their whole life. */
export interface AdminPerson {
  id: ID
  name: string
  handle?: string
  phone?: string
  email?: string
  area?: string
  country?: string
  joinedAt: ISODate
  deletedAt?: ISODate
  games: number
  staff: boolean
  /** Hosting without an account: a name and a number, no way to sign in yet. */
  guestHost: boolean
}

/** One line of someone's history, for answering "what happened to me". */
export interface AdminEntry {
  at: ISODate
  what: string
  detail: string
}

/** A message, for moderation. */
export interface AdminMessage {
  id: ID
  gameId: ID
  gameTitle: string
  saidBy: ID
  saidByName: string
  body: string
  at: ISODate
}

/** How the app is doing over a window. */
/** The SMS bundle that sign-in codes by phone draw on. `credits` is null when the provider couldn't be asked. */
export interface AdminSms {
  configured: boolean
  credits: number | null
  lowAt: number
  low: boolean
}

export interface AdminHealth {
  signups: number
  /** Of the signups, those who finished setting up their profile. */
  onboarded: number
  gamesCreated: number
  gamesPlayed: number
  gamesCalledOff: number
  joins: number
  messages: number
  activePeople: number
  bookings: number
  eventsCreated: number
  /** People put in events, by an organiser, a rep or the link. */
  eventPeople: number
  /** Matches and heats with their result put in. */
  eventResults: number
}

/**
 * The player app's pages and films, counted without knowing who (the API's usage_counts). A page
 * is its route ("/games/:id"). `arrivals` are visits: the first page of each, the only one that
 * says where it came from.
 */
export interface AdminVisits {
  opens: number
  arrivals: number
  days: { day: string, opens: number }[]
  pages: { name: string, opens: number, arrivals: number }[]
  sources: { name: string, n: number }[]
  films: { name: string, started: number, finished: number }[]
}

/** The overview's numbers period by period (admin/trends): by day, week (from Monday) or month. */
export interface AdminTrends {
  unit: 'day' | 'week' | 'month'
  buckets: AdminBucket[]
}

export interface AdminBucket {
  /** The day the period starts, "2026-09-21". */
  start: string
  signups: number
  activePeople: number
  gamesCreated: number
  gamesPlayed: number
  eventPeople: number
  visits: number
}

/**
 * From a visit to doing something (admin/funnel). Visits and form opens are counted without knowing
 * who, so the steps are counts side by side, not the same people followed through.
 */
export interface AdminFunnel {
  visits: number
  /** Create pages opened: a game, an event, a venue, a team, a league. */
  openedForm: number
  signups: number
  /** Of the new accounts, those who hosted or joined a game, are in an event, run a workspace or list a venue. */
  didSomething: number
  guests: AdminGuests
}

/** Using PlayChale without an account, and how many then signed up. */
export interface AdminGuests {
  hostsStarted: number
  hostsKept: number
  eventGuests: number
  eventGuestsKept: number
  gameGuests: number
  gameGuestsKept: number
}

/** A games day or corporate games, as the desk lists it. */
export interface AdminEvent {
  id: ID
  name: string
  organisation: string
  country: string
  startsOn: string
  endsOn: string
  status: 'open' | 'finished' | 'cancelled'
  /** On today, where it's held. */
  live: boolean
  people: number
  /** Of the people, those who joined without an account. */
  guests: number
  games: number
  resultsIn: number
  resultsTotal: number
  publicSlug?: string
  createdAt: ISODate
}

/** Someone who runs an event's workspace: who to call on the day. */
export interface AdminOrganiser {
  id: ID
  name: string
  phone?: string
  email?: string
  role: 'owner' | 'admin'
}

export interface AdminEventGame {
  id: ID
  name: string
  entryKind: 'single' | 'pair' | 'team'
  format: 'knockout' | 'league' | 'placings' | 'pools'
  status: 'open' | 'drawn' | 'finished'
  entries: number
  resultsIn: number
  resultsTotal: number
}

export interface AdminEventDetail {
  event: AdminEvent
  organisers: AdminOrganiser[]
  games: AdminEventGame[]
}

/** A game, as the desk lists it: enough to tell a real one from a fake. */
export interface AdminGame {
  id: ID
  title: string
  sport: string
  format: string
  startsAt: ISODate
  venueName: string
  venueArea?: string
  hostId: ID
  hostName?: string
  /** Its host has no account (a guest host). */
  hostGuest: boolean
  visibility: 'public' | 'private'
  players: number
  capacity?: number
  status: 'open' | 'full' | 'completed' | 'cancelled'
  cancelReason?: string
  createdAt: ISODate
  messages: number
  /** A competition's game: only the competition changes it. */
  fixture: boolean
}

/** A venue as staff check it: where it is, how to reach it, what it charges, who listed it. */
export interface AdminVenue {
  id: ID
  name: string
  area: string
  country: string
  currency: string
  address?: string
  mapUrl?: string
  latitude?: number
  longitude?: number
  /** The venue's own number, shown to players who book. */
  phone?: string
  description?: string
  amenities: string[]
  ownerId: ID
  ownerName?: string
  ownerGuest: boolean
  /** Waiting for staff, live, or declined with a note for the owner. */
  review: 'pending' | 'approved' | 'declined'
  reviewNote?: string
  reviewedAt?: ISODate
  createdAt: ISODate
  bookings: number
  pitches: { name: string, sport: string, format: string, pricePerHour: number }[]
}
