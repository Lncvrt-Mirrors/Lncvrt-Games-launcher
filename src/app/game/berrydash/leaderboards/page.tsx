'use client'

import { useCallback, useEffect, useState } from 'react'
import { BirdColor } from '@/types/BerryDash/BirdColor'
import { GetIconForUser } from '@/lib/BerryDash'
import Image from 'next/image'
import './styles.css'
import { useRouter } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'
import { fetch } from '@tauri-apps/plugin-http'
import { verifySignature } from '@/lib/Util'

interface BaseEntry {
  id: number
  username: string
  value: number
  icon: number
  overlay: number
  birdColor: BirdColor
  overlayColor: BirdColor
  customIcon: string | null
}

interface Stats {
  highScore: string
  totalNormalBerries: string
  totalPoisonBerries: string
  totalSlowBerries: string
  totalUltraBerries: string
  totalSpeedyBerries: string
  totalCoinBerries: string
  totalRandomBerries: string
  totalAntiBerries: string
  totalGoldenBerries: string
  coins: string
}

interface LeaderboardEntry extends BaseEntry {
  type: 'leaderboard'
  value: number
}

interface Account extends BaseEntry {
  type: 'account'
  stats: Stats
  xp: bigint
}

export function calculateXP (
  normalBerries: bigint,
  poisonBerries: bigint,
  slowBerries: bigint,
  ultraBerries: bigint,
  speedyBerries: bigint,
  coinBerries: bigint,
  randomBerries: bigint,
  antiBerries: bigint,
  goldenBerries: bigint
): bigint {
  let totalXp = 0n
  totalXp += normalBerries
  totalXp -= poisonBerries
  totalXp -= slowBerries
  totalXp += ultraBerries * 5n
  totalXp += speedyBerries * 10n
  totalXp += coinBerries * 10n
  totalXp += randomBerries
  totalXp -= antiBerries
  totalXp += goldenBerries * 4n

  if (totalXp < 0n) totalXp = 0n
  return totalXp
}

export function calculateLevel (xp: bigint): number {
  const levelDivisor = 50.0

  const xpNumber = Number(xp)
  const discriminant = 95 * 95 + levelDivisor * 2 * xpNumber
  const level = (-95 + Math.sqrt(discriminant)) / levelDivisor
  return Math.floor(level) + 1
}

export default function BerryDashLeaderboards () {
  const [selected, setSelected] = useState<number>(-1)
  const [selectedBerryOption, setSelectedBerryOption] = useState<number>(0)
  const [entries, setEntries] = useState<(LeaderboardEntry | Account)[]>([])

  const router = useRouter()

  const Refresh = useCallback(async () => {
    try {
      if (selected == 3 || selected == 4) {
        const response = await fetch(
          'https://games.lncvrt.xyz/api/berrydash/account?username='
        )
        const signature = response.headers.get('x-signature') ?? ''
        const data = await response.json()
        if (
          (await verifySignature(JSON.stringify(data), signature)) &&
          data.success
        ) {
          let accounts = data.data as Account[]

          accounts = accounts.map(acc => {
            const xp = calculateXP(
              BigInt(acc.stats.totalNormalBerries),
              BigInt(acc.stats.totalPoisonBerries),
              BigInt(acc.stats.totalSlowBerries),
              BigInt(acc.stats.totalUltraBerries),
              BigInt(acc.stats.totalSpeedyBerries),
              BigInt(acc.stats.totalCoinBerries),
              BigInt(acc.stats.totalRandomBerries),
              BigInt(acc.stats.totalAntiBerries),
              BigInt(acc.stats.totalGoldenBerries)
            )
            return { ...acc, xp }
          })

          accounts.sort((a, b) => (b.xp > a.xp ? 1 : b.xp < a.xp ? -1 : 0))

          setEntries(accounts)
        } else console.log('Failed')
      } else {
        const response = await fetch(
          'https://games.lncvrt.xyz/api/berrydash/leaderboard/' +
            (selected == 0
              ? 'score'
              : selected == 1
              ? 'berry?berry=' + selectedBerryOption
              : selected == 2
              ? 'coin'
              : selected == 5
              ? 'legacy'
              : 'total')
        )
        const signature = response.headers.get('x-signature') ?? ''
        const data = await response.json()
        if (
          (await verifySignature(JSON.stringify(data), signature)) &&
          data.success
        )
          setEntries(data.data as LeaderboardEntry[])
      }
    } catch {
      setEntries([])
    }
  }, [selected, selectedBerryOption])

  useEffect(() => {
    document.title = 'Lncvrt Games - Berry Dash Leaderboards'
  }, [])

  useEffect(() => {
    if (selected != -1) setTimeout(() => Refresh(), 0)
  }, [selected, Refresh])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Berry Dash Leaderboards</p>
        <div className='flex gap-2'>
          <button
            className='button btntheme1'
            onClick={() => {
              setEntries([])
              Refresh()
            }}
            title='Click to refresh the leaderboards.'
            hidden={selected == -1}
          >
            Refresh
          </button>
          <button
            className='button btntheme1'
            onClick={() => {
              if (selected == -1) router.push('/game?id=1')
              else {
                setSelected(-1)
                setSelectedBerryOption(0)
                setEntries([])
              }
            }}
            title='Click to go up a level.'
          >
            Back
          </button>
        </div>
      </div>
      <div
        className={`box ${
          platform() == 'windows'
            ? 'h-[calc(100vh-116px)]'
            : 'h-[calc(100vh-84px)]'
        }`}
      >
        {selected == -1 ? (
          <>
            <p className='text-center mt-2 text-xl'>Select a Leaderboard</p>
            <div className='flex flex-col gap-2 mt-2 items-center justify-center'>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(0)}
              >
                Score Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(1)}
              >
                Berry Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(2)}
              >
                Coins Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(3)}
              >
                Level Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(4)}
              >
                Total XP Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(5)}
              >
                Legacy Leaderboard
              </button>
              <button
                className='leaderboard-button'
                onClick={() => setSelected(6)}
              >
                Total Berries Leaderboard
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className={`flex flex-col gap-2 overflow-y-auto ${
                selected == 1
                  ? platform() == 'windows'
                    ? 'h-[calc(100vh-156px)]'
                    : 'h-[calc(100vh-124px)]'
                  : platform() == 'windows'
                  ? 'h-[calc(100vh-128px)]'
                  : 'h-[calc(100vh-96px)]'
              } px-1`}
            >
              {entries.map((item, index) => {
                const isAccount = 'stats' in item
                const isLeaderboard = 'value' in item && !isAccount

                return (
                  <div
                    key={item.id}
                    className='leaderboard-entry flex justify-between items-center'
                  >
                    <div className='flex items-center gap-1'>
                      <Image
                        src={
                          !item.customIcon
                            ? `https://games.lncvrt.xyz/api/berrydash/render-icon?icon=${
                                item.icon == 1
                                  ? GetIconForUser(item.id)
                                  : item.icon
                              }&overlay=${item.overlay}&birdR=${
                                item.birdColor[0]
                              }&birdG=${item.birdColor[1]}&birdB=${
                                item.birdColor[2]
                              }&overlayR=${item.overlayColor[0]}&overlayG=${
                                item.overlayColor[1]
                              }&overlayB=${item.overlayColor[2]}`
                            : `https://games.lncvrt.xyz/api/berrydash/icon-marketplace/icon?id=${item.customIcon}&raw=true`
                        }
                        width={48}
                        height={48}
                        alt=''
                        className='pointer-events-none scale-x-[-1]'
                      />
                      <p>
                        {item.username} (#{index + 1})
                      </p>
                    </div>

                    {isLeaderboard ? (
                      <p>
                        {selected === 1 || selected === 6
                          ? 'Berries'
                          : selected === 2
                          ? 'Coins'
                          : 'Score'}
                        : {item.value.toLocaleString('en-US')}
                      </p>
                    ) : isAccount ? (
                      <p>
                        {selected === 3 ? 'Level' : 'XP'}:{' '}
                        {selected === 3
                          ? calculateLevel(item.xp).toLocaleString('en-US')
                          : item.xp.toLocaleString('en-US')}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {selected == 1 && (
              <div className='flex justify-center'>
                <select
                  className='mt-1 bg-(--col2) border border-(--col4) rounded-md'
                  value={selectedBerryOption}
                  onChange={e => setSelectedBerryOption(Number(e.target.value))}
                >
                  <option value='0'>Normal Berry</option>
                  <option value='1'>Poison Berry</option>
                  <option value='2'>Slow Berry</option>
                  <option value='3'>Ultra Berry</option>
                  <option value='4'>Speedy Berry</option>
                  <option value='5'>Coin Berry</option>
                  <option value='6'>Random Berry</option>
                  <option value='7'>Anti Berry</option>
                  <option value='8'>Golden Berry</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
