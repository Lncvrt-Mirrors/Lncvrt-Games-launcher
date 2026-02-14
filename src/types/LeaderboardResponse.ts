import { LeaderboardEntry } from './LeaderboardEntry'

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  customIcons: Record<string, string>
}
