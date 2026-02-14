export class SettingsType {
  constructor (
    public allowNotifications: boolean = true,
    public alwaysShowGamesInSidebar: boolean = true,
    public useWineOnUnixWhenNeeded: boolean = false,
    public wineOnUnixCommand: string = 'wine %path%',
    public theme: number = 0
  ) {}
}
