export interface GameVersion {
  id: string
  displayName: string
  releaseDate: number
  game: number
  place: number
  changelog: string
  wine: number | undefined
  category: number
  lastRevision: number
  download: number
  executable: string
}
