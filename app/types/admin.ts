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
export interface AdminHealth {
  signups: number
  gamesCreated: number
  gamesPlayed: number
  gamesCalledOff: number
  joins: number
  messages: number
  activePeople: number
}
