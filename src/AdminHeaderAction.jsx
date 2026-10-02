import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { ShieldCheck } from 'lucide-react'
import { isUserAdmin } from './lib/supabase'
import './admin-header-action.css'

export default function AdminHeaderAction() {
  const { user } = useUser()
  const [adminUserId, setAdminUserId] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (!user?.id) return () => { isMounted = false }

    isUserAdmin(user.id).then((allowed) => {
      if (isMounted) setAdminUserId(allowed ? user.id : null)
    })
    return () => { isMounted = false }
  }, [user?.id])

  if (!user?.id || adminUserId !== user.id) return null

  return <button type="button" className="admin-header-action" title="Open Admin Control Center" onClick={() => { window.history.pushState({}, '', '/admin'); window.dispatchEvent(new PopStateEvent('popstate')) }}><ShieldCheck size={16} aria-hidden="true" /><span>Admin</span></button>
}
