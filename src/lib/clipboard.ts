import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { notifyUser } from './notifications'

export async function copyToClipboard (text: string) {
  await writeText(text)
  await notifyUser('Copied', 'Text "' + text + '" copied to clipboard')
}
