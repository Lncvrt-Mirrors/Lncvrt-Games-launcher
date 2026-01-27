export interface Game {
  id: number
  name: string
  official: boolean
  verified: boolean
  developer: string | null
  subcategoryNames: Record<string, string>
}
