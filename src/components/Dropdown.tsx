import { useState, useRef, useEffect } from 'react'
import '@/styles/dropdown.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

type Option = {
  label: string
  value: string | number
}

type Props = {
  value: string | number
  options: Option[]
  onChange: (value: string | number) => void | Promise<void>
}

export default function Dropdown ({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className='dropdown'>
      <button className='dropdown-btn' onClick={() => setOpen(o => !o)}>
        <span>{selected?.label ?? 'Select...'}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`dropdown-arrow ${open ? 'open' : ''}`}
        />
      </button>
      {open && (
        <div className='dropdown-menu'>
          {options.map(option => (
            <div
              key={option.value}
              className={`dropdown-item ${
                option.value === value ? 'active' : ''
              }`}
              onClick={async () => {
                await onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
