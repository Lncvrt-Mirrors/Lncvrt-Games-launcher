export interface Game {
  id: number
  name: string
  official: boolean
  verified: boolean
  developer: string | null
  categoryNames: Record<string, string>
}
