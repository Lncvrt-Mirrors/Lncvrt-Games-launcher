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
  const folderStat = await stat(relativePath, {
    baseDir: BaseDirectory.AppLocalData
  })

  if (!folderExists || folderStat.isFile) {
    await message(`Game folder "${absolutePath}" not found.`, {
      title: 'Folder not found',
      kind: 'error'
    })
    return
  }

  await openPath(absolutePath)
}
