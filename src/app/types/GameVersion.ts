export interface GameVersion {
  id: string
  displayName: string
  releaseDate: number
  game: number
  downloadUrl: string
  executable: string
  sha512sum: string
  size: number
  place: number
  changelog: string
  wine: number | undefined
  category: number
  lastRevision: number
}
