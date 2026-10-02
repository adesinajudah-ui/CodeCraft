import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import './notification-system.css'

const NotificationContext = createContext(null)
const emptyAnnouncements = []
const emptyReadIds = new Set()

export function NotificationProvider({ children }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [snapshot, setSnapshot] = useState({
    userId: null,
    announcements: [],
    readIds: new Set(),
    loading: true,
    error: '',
  })
  const requestVersion = useRef(0)
  const userId = user?.id
  const isCurrentUserSnapshot = snapshot.userId === userId
  const announcements = isCurrentUserSnapshot ? snapshot.announcements : emptyAnnouncements
  const readIds = isCurrentUserSnapshot ? snapshot.readIds : emptyReadIds
  const loading = isCurrentUserSnapshot
    ? snapshot.loading
    : Boolean(isLoaded && isSignedIn && userId && hasSupabaseConfig)
  const error = !hasSupabaseConfig && isLoaded && isSignedIn && userId
    ? 'Notification service is not configured.'
    : isCurrentUserSnapshot ? snapshot.error : ''

  const refresh = useCallback(async () => {
    if (!userId || !hasSupabaseConfig) return
    const requestId = ++requestVersion.current

    try {
      const [announcementResult, readResult] = await Promise.all([
        supabase
          .from('announcements')
          .select('id,title,body,created_at,publish_at,audience')
          .eq('is_published', true)
          .eq('audience', 'all')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_notification_reads')
          .select('announcement_id')
          .eq('clerk_user_id', userId),
      ])

      if (announcementResult.error) throw announcementResult.error
      if (readResult.error) throw readResult.error

      if (requestId === requestVersion.current) {
        setSnapshot({
          userId,
          announcements: announcementResult.data || [],
          readIds: new Set((readResult.data || []).map((row) => row.announcement_id)),
          loading: false,
          error: '',
        })
      }
    } catch (refreshError) {
      console.error('Notification error:', refreshError)
      if (requestId === requestVersion.current) {
        setSnapshot((current) => ({
          userId,
          announcements: current.userId === userId ? current.announcements : [],
          readIds: current.userId === userId ? current.readIds : new Set(),
          loading: false,
          error: 'Unable to load notifications.',
        }))
      }
    } finally {
      if (requestId === requestVersion.current) {
        setSnapshot((current) => current.loading
          ? { ...current, userId, loading: false }
          : current)
      }
    }
  }, [userId])

  useEffect(() => {
    if (!isLoaded) return undefined
    if (!isSignedIn || !userId || !hasSupabaseConfig) return undefined

    let active = true

    const load = async () => {
      if (active) await refresh()
    }

    void load()

    const channel = supabase
      .channel(`codecraft-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        void load()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_notification_reads',
        filter: `clerk_user_id=eq.${userId}`,
      }, () => {
        void load()
      })
      .subscribe((status, subscriptionError) => {
        if (status === 'SUBSCRIBED') {
          void load()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Notification realtime subscription failed:', subscriptionError || status)
        }
      })
    // Scheduled announcements stay hidden by RLS until publish_at, so realtime alone cannot expose them early.
    const scheduledAnnouncementRefresh = window.setInterval(() => {
      void load()
    }, 60_000)

    return () => {
      active = false
      requestVersion.current += 1
      window.clearInterval(scheduledAnnouncementRefresh)
      void supabase.removeChannel(channel)
    }
  }, [isLoaded, isSignedIn, refresh, userId])

  const markRead = useCallback(async (announcementId) => {
    if (!userId) return false
    if (readIds.has(announcementId)) return true

    try {
      const { error: writeError } = await supabase
        .from('user_notification_reads')
        .upsert(
          { clerk_user_id: userId, announcement_id: announcementId },
          { onConflict: 'clerk_user_id,announcement_id', ignoreDuplicates: true },
        )

      if (writeError) throw writeError
      setSnapshot((current) => ({
        userId,
        announcements: current.userId === userId ? current.announcements : [],
        readIds: new Set(current.userId === userId ? current.readIds : []).add(announcementId),
        loading: false,
        error: '',
      }))
      return true
    } catch (writeError) {
      console.error('Notification error:', writeError)
      setSnapshot((current) => ({
        userId,
        announcements: current.userId === userId ? current.announcements : [],
        readIds: current.userId === userId ? current.readIds : new Set(),
        loading: false,
        error: 'Unable to update notification read status.',
      }))
      return false
    }
  }, [readIds, userId])

  const markAllRead = useCallback(async () => {
    if (!userId) return false

    const unreadIds = announcements
      .filter((announcement) => !readIds.has(announcement.id))
      .map((announcement) => announcement.id)

    if (!unreadIds.length) return true

    try {
      const { error: writeError } = await supabase
        .from('user_notification_reads')
        .upsert(
          unreadIds.map((announcementId) => ({ clerk_user_id: userId, announcement_id: announcementId })),
          { onConflict: 'clerk_user_id,announcement_id', ignoreDuplicates: true },
        )

      if (writeError) throw writeError
      setSnapshot((current) => ({
        userId,
        announcements: current.userId === userId ? current.announcements : announcements,
        readIds: new Set([...(current.userId === userId ? current.readIds : []), ...unreadIds]),
        loading: false,
        error: '',
      }))
      return true
    } catch (writeError) {
      console.error('Notification error:', writeError)
      setSnapshot((current) => ({
        userId,
        announcements: current.userId === userId ? current.announcements : announcements,
        readIds: current.userId === userId ? current.readIds : new Set(),
        loading: false,
        error: 'Unable to update notification read status.',
      }))
      return false
    }
  }, [announcements, readIds, userId])

  const value = useMemo(() => ({
    announcements,
    readIds,
    loading,
    error,
    markRead,
    markAllRead,
  }), [announcements, readIds, loading, error, markRead, markAllRead])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

function formatNotificationTime(value) {
  if (!value) return 'Just now'

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'Just now'
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} min ago`
  if (elapsedSeconds < 86400) {
    const hours = Math.floor(elapsedSeconds / 3600)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(elapsedSeconds / 86400)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export function NotificationBell() {
  const notificationState = useContext(NotificationContext)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const rootRef = useRef(null)

  if (!notificationState) {
    throw new Error('NotificationBell must be rendered inside NotificationProvider.')
  }

  const { announcements, readIds, loading, error, markRead, markAllRead } = notificationState
  const unreadCount = announcements.filter((announcement) => !readIds.has(announcement.id)).length

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const openAnnouncement = async (announcement) => {
    setSelectedId((current) => current === announcement.id ? null : announcement.id)
    if (!readIds.has(announcement.id)) {
      setSaving(true)
      await markRead(announcement.id)
      setSaving(false)
    }
  }

  const handleMarkAllRead = async () => {
    setSaving(true)
    await markAllRead()
    setSaving(false)
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-controls="codecraft-notification-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="notification-unread-count"
            data-count-size={unreadCount < 10 ? 'single' : 'multiple'}
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="notification-popover" id="codecraft-notification-panel" aria-label="Notifications">
          <header className="notification-popover-header">
            <div>
              <h2>Notifications</h2>
              {unreadCount > 0 && <span>{unreadCount} unread</span>}
            </div>
            <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
              <X size={17} aria-hidden="true" />
            </button>
          </header>

          {error && <p className="notification-error" role="alert">{error}</p>}

          {loading ? (
            <div className="notification-loading" role="status" aria-label="Loading notifications">
              <span /><span /><span />
            </div>
          ) : announcements.length ? (
            <div className="notification-list">
              {announcements.map((announcement) => {
                const isRead = readIds.has(announcement.id)
                const isSelected = selectedId === announcement.id
                return (
                  <button
                    type="button"
                    className={`notification-item ${isRead ? '' : 'is-unread'} ${isSelected ? 'is-expanded' : ''}`}
                    key={announcement.id}
                    aria-expanded={isSelected}
                    onClick={() => { void openAnnouncement(announcement) }}
                  >
                    <span className="notification-item-heading">
                      <strong>{announcement.title}</strong>
                      <time dateTime={announcement.created_at}>{formatNotificationTime(announcement.created_at)}</time>
                    </span>
                    <span className={`notification-item-message ${isSelected ? 'is-full' : ''}`}>{announcement.body}</span>
                    {!isRead && <span className="notification-item-unread-label">New</span>}
                  </button>
                )
              })}
            </div>
          ) : !error ? (
            <div className="notification-empty">
              <CheckCheck size={22} aria-hidden="true" />
              <strong>You’re all caught up!</strong>
              <span>No new notifications.</span>
            </div>
          ) : null}

          {unreadCount > 0 && (
            <footer className="notification-popover-footer">
              <button type="button" onClick={() => { void handleMarkAllRead() }} disabled={saving}>
                Mark all as read
              </button>
            </footer>
          )}
        </section>
      )}
    </div>
  )
}
