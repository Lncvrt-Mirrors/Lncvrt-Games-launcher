export interface Mod {
  id: number
  name: string
  description: string | null
  creators: string[]
  downloads: number
  released: number
  updated: number
  latestVersion: string
  latestDownload: number
  changelog: string | null
}
