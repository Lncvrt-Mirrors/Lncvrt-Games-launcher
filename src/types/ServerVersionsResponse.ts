import { Game } from './Game'
import { GameVersion } from './GameVersion'

export interface ServerVersionsResponse {
  versions: GameVersion[]
  games: Game[]
}
