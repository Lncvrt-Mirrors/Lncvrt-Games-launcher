type VersionsConfigData = {
  version: string
  list: string[]
  timestamps: Record<string, number>
}

export class VersionsConfig {
  constructor (
    public version: string,
    public list: string[] = [],
    public timestamps: Record<string, number> = {}
  ) {}

  static import (data: VersionsConfigData) {
    const cfg = new VersionsConfig(data.version)
    cfg.list = [...data.list]
    cfg.timestamps = { ...data.timestamps }
    return cfg
  }
}
