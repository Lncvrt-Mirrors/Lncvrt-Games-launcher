export interface GameVersion {
  id: string
  versionName: string
  releaseDate: number
  game: number
  downloadUrl: string
  executable: string
  sha512sum: string
  size: number
  place: number
  changelog: string
  wine: number | undefined
}
