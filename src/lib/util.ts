import { message } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

export const openFolder = async (name: string) => {
  try {
    await invoke('open_game_folder', { version: name })
  } catch (e) {
    await message(String(e), {
      title: 'Folder not found',
      kind: 'error'
    })
  }
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

export const verifySignature = async (body: string, signature: string) => {
  try {
    const result = await invoke<boolean>('verify_signature', {
      body: body ?? '',
      signature: signature ?? '',
      publicKey: process.env.NEXT_PUBLIC_PUBLIC_SIGNING_KEY ?? ''
    })
    return Boolean(result)
  } catch {
    return false
  }
}
