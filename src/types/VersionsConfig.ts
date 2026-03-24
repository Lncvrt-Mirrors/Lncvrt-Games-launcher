export type VersionsConfigData = {
  version: string
  list: Record<string, number>
  mods: Record<string, string>
}

export class VersionsConfig {
  constructor (
    public version: string,
    public list: Record<string, number> = {},
    public mods: Record<string, string> = {}
  ) {}

  static import (data: VersionsConfigData) {
    const cfg = new VersionsConfig(data.version)
    cfg.list = { ...data.list }
    cfg.mods = { ...data.mods }
    return cfg
  }
}
