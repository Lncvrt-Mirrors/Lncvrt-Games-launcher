import '@/styles/dropdown.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

export default function ExpandArrow ({ open }: { open: boolean }) {
  return (
    <FontAwesomeIcon
      icon={faChevronDown}
      className={`dropdown-arrow ${!open ? 'open' : ''}`}
    />
  )
}
