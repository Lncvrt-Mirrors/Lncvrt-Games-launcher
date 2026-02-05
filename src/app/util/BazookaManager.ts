import { app } from '@tauri-apps/api'
import { NormalConfig } from '../types/NormalConfig'
import {
  BaseDirectory,
  create,
  exists,
  mkdir,
  readTextFile,
  writeFile
} from '@tauri-apps/plugin-fs'
import { VersionsConfig } from '../types/VersionsConfig'

export async function readNormalConfig (): Promise<NormalConfig> {
  const version = await app.getVersion()
  try {
    const options = {
      baseDir: BaseDirectory.AppLocalData
    }
    const doesFolderExist = await exists('', options)
    const doesConfigExist = await exists('config.json', options)
    if (!doesFolderExist || !doesConfigExist) {
      if (!doesFolderExist) {
        await mkdir('', options)
      }
      const file = await create('config.json', options)
      await file.write(
        new TextEncoder().encode(
          JSON.stringify(new NormalConfig(version), null, 2)
        )
      )
      await file.close()
      return new NormalConfig(version)
    }
    const config = await readTextFile('config.json', options)
    const raw = JSON.parse(config)
    if (
      raw.settings &&
      raw.settings.theme &&
      (raw.version == '1.0.0' ||
        raw.version == '1.1.0' ||
        raw.version == '1.1.1' ||
        raw.version == '1.2.0' ||
        raw.version == '1.3.0' ||
        raw.version == '1.3.1' ||
        raw.version == '1.4.0' ||
        raw.version == '1.5.0' ||
        raw.version == '1.5.1' ||
        raw.version == '1.5.2' ||
        raw.version == '1.5.3' ||
        raw.version == '1.5.4')
    ) {
      const parsed = Number(raw.settings.theme)
      if (parsed == 3) raw.settings.theme = 2
      if (parsed == 4) raw.settings.theme = 3
      else if (parsed != 0 && parsed != 1) raw.settings.theme = 0
    }
    raw.version = version
    writeNormalConfig(raw)
    return NormalConfig.import(raw)
  } catch {
    return new NormalConfig(version)
  }
}

export async function writeNormalConfig (data: NormalConfig) {
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('config.json', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('config.json', options)
    await file.write(new TextEncoder().encode(JSON.stringify(data, null, 2)))
    await file.close()
  } else {
    await writeFile(
      'config.json',
      new TextEncoder().encode(JSON.stringify(data, null, 2)),
      options
    )
  }
}

export async function readVersionsConfig (): Promise<VersionsConfig> {
  const version = await app.getVersion()
  try {
    const options = {
      baseDir: BaseDirectory.AppLocalData
    }
    const doesFolderExist = await exists('', options)
    const doesConfigExist = await exists('versions.json', options)
    if (!doesFolderExist || !doesConfigExist) {
      if (!doesFolderExist) {
        await mkdir('', options)
      }
      const file = await create('versions.json', options)
      await file.write(
        new TextEncoder().encode(
          JSON.stringify(new VersionsConfig(version), null, 2)
        )
      )
      await file.close()
      return new VersionsConfig(version)
    }
    const config = await readTextFile('versions.json', options)
    const raw = JSON.parse(config)
    if (raw.list && raw.timestamps) {
      raw.list = raw.timestamps
      delete raw.timestamps

      await writeFile(
        'versions.json',
        new TextEncoder().encode(JSON.stringify(raw, null, 2)),
        options
      )
    }
    raw.version = version
    writeVersionsConfig(raw)
    return VersionsConfig.import(raw)
  } catch {
    return new VersionsConfig(version)
  }
}

export async function writeVersionsConfig (data: VersionsConfig) {
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('versions.json', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('versions.json', options)
    await file.write(new TextEncoder().encode(JSON.stringify(data, null, 2)))
    await file.close()
  } else {
    await writeFile(
      'versions.json',
      new TextEncoder().encode(JSON.stringify(data, null, 2)),
      options
    )
  }
}
