import { SettingsType } from './SettingsType'

type NormalConfigData = {
  version: string
  settings?: Partial<SettingsType>
}

export class NormalConfig {
  constructor (
    public version: string,
    public settings: SettingsType = new SettingsType()
  ) {}

  static import (data: NormalConfigData) {
    const cfg = new NormalConfig(data.version)
    if (data.settings) {
      cfg.settings = { ...cfg.settings, ...data.settings }
    }
    return cfg
  }
}
