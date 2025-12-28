'use client'

import { useEffect, useState } from 'react'
import { Setting } from '../componets/Setting'
import { writeNormalConfig } from '../util/BazookaManager'
import { useGlobal } from '../GlobalProvider'
import { copyToClipboard } from '../util/Clipboard'

export default function Settings () {
  const [allowNotifications, setAllowNotifications] = useState(false)
  const [alwaysShowGamesInSidebar, setAlwaysShowGamesInSidebar] =
    useState(false)
  const [useLegacyInteractButtons, setUseLegacyInteractButtons] =
    useState(false)
  const [theme, setTheme] = useState(0)

  const [loaded, setLoaded] = useState(false)
  const { normalConfig, setNormalConfig, version } = useGlobal()

  useEffect(() => {
    ;(async () => {
      while (normalConfig != null) {
        setAllowNotifications(normalConfig.settings.allowNotifications)
        setAlwaysShowGamesInSidebar(
          normalConfig.settings.alwaysShowGamesInSidebar
        )
        setUseLegacyInteractButtons(
          normalConfig.settings.useLegacyInteractButtons
        )
        setTheme(normalConfig.settings.theme)
        setLoaded(true)
        break
      }
    })()
  }, [normalConfig])

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Settings</p>
      {loaded && (
        <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
          <Setting
            label='Allow sending notifications'
            value={allowNotifications}
            onChange={async () => {
              while (normalConfig != null) {
                setAllowNotifications(!allowNotifications)
                setNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    allowNotifications: !allowNotifications
                  }
                })
                writeNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    allowNotifications: !allowNotifications
                  }
                })
                break
              }
            }}
            title='This setting does as you expect, allow the launcher to send notifications for when stuff like downloading is done.'
          />
          <Setting
            label='Always show games in sidebar'
            value={alwaysShowGamesInSidebar}
            onChange={async () => {
              while (normalConfig != null) {
                setAlwaysShowGamesInSidebar(!alwaysShowGamesInSidebar)
                setNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    alwaysShowGamesInSidebar: !alwaysShowGamesInSidebar
                  }
                })
                writeNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    alwaysShowGamesInSidebar: !alwaysShowGamesInSidebar
                  }
                })
                break
              }
            }}
            title="This setting will make it so when you are on a page like this, the games won't disappear."
          />
          <Setting
            label='Show Installs/Launch Buttons'
            value={useLegacyInteractButtons}
            onChange={async () => {
              while (normalConfig != null) {
                setUseLegacyInteractButtons(!useLegacyInteractButtons)
                setNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    useLegacyInteractButtons: !useLegacyInteractButtons
                  }
                })
                writeNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    useLegacyInteractButtons: !useLegacyInteractButtons
                  }
                })
                break
              }
            }}
            title='Enable the legacy method of using the installs/launch buttons. In the future this setting may be removed so try and get used to the new method.'
          />
          <div title='The theme you want the launcher to use.'>
            <label className='text-lg'>Theme:</label>
            <select
              className='ml-2 bg-(--col2) border border-(--col4) rounded-md'
              value={theme}
              onChange={async e => {
                const newTheme = parseInt(e.target.value)
                while (normalConfig != null) {
                  setTheme(newTheme)
                  setNormalConfig({
                    ...normalConfig,
                    settings: {
                      ...normalConfig.settings,
                      theme: newTheme
                    }
                  })
                  writeNormalConfig({
                    ...normalConfig,
                    settings: {
                      ...normalConfig.settings,
                      theme: newTheme
                    }
                  })
                  break
                }
              }}
            >
              <option value={0}>Dark (default)</option>
              <option value={1}>Red</option>
              <option value={2}>Green</option>
              <option value={3}>Blue</option>
              <option value={4}>Purple</option>
              <option value={5}>Mint</option>
            </select>
          </div>
        </div>
      )}
      <p
        className='fixed bottom-1.5 right-1.5 rounded-md cursor-pointer px-1 border z-100 transition-colors btntheme1'
        onClick={async () => {
          await copyToClipboard(`v${version}`, normalConfig)
        }}
        title='The current launcher version.'
      >
        v{version}
      </p>
    </>
  )
}
