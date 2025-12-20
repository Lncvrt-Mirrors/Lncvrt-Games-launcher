export class SettingsType {
  constructor (
    public allowNotifications: boolean = true,
    public alwaysShowGamesInSidebar: boolean = true,
    public useLegacyInteractButtons: boolean = false,
    public theme: number = 0
  ) {}
}
