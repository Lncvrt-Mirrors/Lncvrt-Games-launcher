import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { notifyUser } from './Notifications'

export async function copyToClipboard (
  text: string,
  notificationsAllowed: boolean
) {
  await writeText(text)
  if (notificationsAllowed)
    await notifyUser('Copied', 'Text "' + text + '" copied to clipboard')
}
