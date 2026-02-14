export interface LeaderboardEntry {
  username: string
  userid: bigint
  value: bigint
  icon: number
  overlay: number
  birdColor: number[]
  overlayColor: number[]
  customIcon: string | null
}
