import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function MobileNavigation({ items, label = 'CodeCraft navigation', presentation = 'drawer' }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  const selectItem = (item) => {
    setIsOpen(false)
    item.onSelect()
  }

  return (
    <>
      <button
        type="button"
        className={`mobile-navigation-trigger ${presentation === 'landing' ? 'mobile-navigation-trigger--landing' : ''}`}
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-drawer"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
      </button>
      {isOpen && presentation === 'landing' && (
        <nav className="landing-nav is-open mobile-navigation-landing-menu" aria-label="Primary navigation">
          {items.map((item) => (
            <button type="button" key={item.id} className={item.className || ''} onClick={() => selectItem(item)}>
              {item.label}
            </button>
          ))}
        </nav>
      )}
      {isOpen && presentation === 'drawer' && (
        <div className="mobile-navigation-layer">
          <button
            type="button"
            className="mobile-navigation-backdrop"
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
          />
          <aside className="mobile-navigation-drawer" id="mobile-navigation-drawer" aria-label={label}>
            <div className="mobile-navigation-heading">
              <strong>CodeCraft</strong>
              <button type="button" aria-label="Close navigation" onClick={() => setIsOpen(false)}>
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <nav>
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={item.isActive ? 'is-active' : ''}
                  onClick={() => selectItem(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
