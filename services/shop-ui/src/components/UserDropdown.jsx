import { useState, useRef, useEffect } from 'react'
import { getInitials } from '../services/api'

function UserDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const initials = getInitials(user.name || user.username)

  const rolesHtml = (user.roles || [])
    .filter(role => !role.startsWith('default-roles-'))
    .map(role => (
      <span key={role} className={`role-badge ${role === 'admin' ? 'admin' : ''}`}>
        {role}
      </span>
    ))

  if (rolesHtml.length === 0) {
    rolesHtml.push(<span key="user" className="role-badge">user</span>)
  }

  return (
    <div className="user-profile-wrapper" ref={wrapperRef}>
      <span
        className="user-profile-trigger"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        title="Clicca per vedere il profilo"
      >
        Ciao, {user.name || user.username}! <span style={{ fontSize: '0.75rem' }}>{String.fromCodePoint(0x25BC)}</span>
      </span>
      <div className={`user-profile-dropdown ${isOpen ? 'show' : ''}`}>
        <div className="user-profile-header">
          <div className="user-avatar">{initials}</div>
          <div className="user-profile-name">{user.name || user.username}</div>
          <div className="user-profile-email">{user.email || ''}</div>
        </div>
        <div className="user-profile-details">
          <div className="user-profile-item">
            <span className="user-profile-label">Username</span>
            <span className="user-profile-value">{user.username || '-'}</span>
          </div>
          <div className="user-profile-item">
            <span className="user-profile-label">User ID</span>
            <span className="user-profile-value" title={user.id}>
              {user.id ? user.id.substring(0, 8) + '...' : '-'}
            </span>
          </div>
          <div className="user-profile-item">
            <span className="user-profile-label">Ruoli</span>
            <div className="user-profile-value user-profile-roles">
              {rolesHtml}
            </div>
          </div>
          <div className="user-profile-item">
            <span className="user-profile-label">Puo fare checkout</span>
            <span className="user-profile-value">
              {user.canCheckout ? String.fromCodePoint(0x2713) + ' Si' : String.fromCodePoint(0x2717) + ' No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDropdown
