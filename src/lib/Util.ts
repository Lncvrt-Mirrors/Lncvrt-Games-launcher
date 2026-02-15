import { message } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, exists, stat } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { join, appLocalDataDir } from '@tauri-apps/api/path'

export const openFolder = async (name: string) => {
  const relativePath = await join('game', name)
  const basePath = await appLocalDataDir()
  const absolutePath = await join(basePath, relativePath)

  const folderExists = await exists(relativePath, {
    baseDir: BaseDirectory.AppLocalData
  })

  if (!folderExists) {
    await message(`Game folder "${absolutePath}" not found.`, {
      title: 'Folder not found',
      kind: 'error'
    })
    return
  }

  const folderStat = await stat(relativePath, {
    baseDir: BaseDirectory.AppLocalData
  })

  if (folderStat.isFile) {
    await message(`Game folder "${absolutePath}" not found.`, {
      title: 'Folder not found',
      kind: 'error'
    })
    return
  }

  await openPath(absolutePath)
}

export const formatEtaSmart = (seconds: number) => {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return `${d}d ${h}h`
}
