export type VersionsConfigData = {
  version: string
  list: Record<string, number>
  mods: Record<string, Record<string, number>>
}

export class VersionsConfig {
  constructor (
    public version: string,
    public list: Record<string, number> = {},
    public mods: Record<string, Record<string, number>> = {}
  ) {}

  static import (data: VersionsConfigData) {
    const cfg = new VersionsConfig(data.version)
    cfg.list = { ...data.list }
    cfg.mods = { ...data.mods }
    return cfg
  }
}
