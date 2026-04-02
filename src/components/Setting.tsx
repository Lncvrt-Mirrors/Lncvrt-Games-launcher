import '@/styles/setting.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { SettingProps } from '@/types/SettingProps'

export function Setting ({
  label,
  value,
  onChange,
  className,
  title
}: SettingProps) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${className}`} title={title}>
      <label className='text-white text-lg'>{label}</label>
      <div className='setting-checkbox-wrapper'>
        <input
          type='checkbox'
          className='setting-checkbox'
          checked={value}
          onChange={() => onChange(!value)}
        />
        {value && <FontAwesomeIcon icon={faCheck} className='fa-check-icon' />}
      </div>
    </div>
  )
}
