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
    return NormalConfig.import(JSON.parse(config))
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
    return VersionsConfig.import(JSON.parse(config))
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
