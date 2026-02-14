import { NormalConfig } from '@/types/NormalConfig'
import { notifyUser } from './Notifications'

export async function copyToClipboard (
  text: string,
  normalConfig: NormalConfig | null
) {
  if (normalConfig?.settings.allowNotifications)
    await notifyUser('Copied', 'Text "' + text + '" copied to clipboard')
}
