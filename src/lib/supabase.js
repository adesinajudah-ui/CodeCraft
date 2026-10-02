import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
let clerkAccessTokenProvider = null

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    accessToken: async () => clerkAccessTokenProvider ? clerkAccessTokenProvider() : null,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export function configureSupabaseAccessToken(provider) {
  clerkAccessTokenProvider = provider
}

const buildInitials = (value = '') => {
  if (!value) return 'CC'
  return value
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return 'Just now'

  const then = new Date(dateValue)
  const diffMs = Date.now() - then.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export const getClerkUserId = (user) => user?.id || null

export async function ensureProfileFromClerk(user) {
  if (!user || !hasSupabaseConfig) return null

  const clerkUserId = getClerkUserId(user)
  if (!clerkUserId) return null

  const username = user.username || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'CodeCraft Member'
  const avatarUrl = user.imageUrl || null

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_user_id', ignoreDuplicates: false },
    )
    .select()
    .single()

  if (error) {
    console.error('Supabase profile sync failed:', error)
    return null
  }

  return data
}

export async function isUserAdmin(clerkUserId) {
  if (!clerkUserId || !hasSupabaseConfig) return false

  const { data, error } = await supabase.rpc('is_codecraft_admin')

  if (error) {
    console.error('Admin lookup failed:', error)
    return false
  }

  return Boolean(data)
}

export async function isUserAccountActive() {
  if (!hasSupabaseConfig) return true

  const { data, error } = await supabase.rpc('is_codecraft_user_active')
  if (error) {
    console.error('Account status lookup failed:', error)
    return true
  }

  return Boolean(data)
}

export async function fetchPublicSiteSettings() {
  if (!hasSupabaseConfig) return {}

  const { data, error } = await supabase.rpc('get_codecraft_settings')
  if (error) {
    console.error('Site settings lookup failed:', error)
    return {}
  }

  return data || {}
}

export async function updateUserAdminRole({ targetClerkUserId, enabled, actorClerkUserId }) {
  if (!targetClerkUserId || !actorClerkUserId || !hasSupabaseConfig) return null
  const { error } = await supabase.rpc('set_codecraft_admin_role', {
    p_target_clerk_user_id: targetClerkUserId,
    p_enabled: enabled,
  })
  if (error) throw new Error(error.message || 'Unable to change admin access.')
  return true
}

export async function uploadStorageFile({ bucket, clerkUserId, file, folderName }) {
  if (!file || !bucket || !clerkUserId || !hasSupabaseConfig) return null

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const filePath = `${clerkUserId}/${folderName || 'uploads'}/${safeName}`

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) {
    console.error('Storage upload failed:', error)
    return null
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return publicUrlData?.publicUrl || null
}

export async function createProjectRecord({ clerkUserId, title, description, code, language, fileUrl, previewImageUrl }) {
  if (!clerkUserId || !hasSupabaseConfig) return null

  const { data, error } = await supabase
    .from('projects')
    .insert({
      clerk_user_id: clerkUserId,
      title: title || 'Untitled project',
      description: description || '',
      code: code || '',
      language: language || 'javascript',
      file_url: fileUrl || null,
      preview_image_url: previewImageUrl || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Project creation failed:', error)
    return null
  }

  return data
}

export async function createCommunityPost({ clerkUserId, postType, content, projectId = null, attachments = [] }) {
  if (!clerkUserId || !hasSupabaseConfig) return null

  const normalizedPostType = ['project', 'question', 'achievement', 'discussion'].includes(postType) ? postType : 'discussion'
  const { data, error } = await supabase
    .from('posts')
    .insert({
      clerk_user_id: clerkUserId,
      post_type: normalizedPostType,
      content: content || '',
      project_id: projectId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Post creation failed:', error)
    return null
  }

  const uploadResults = await Promise.all(
    (attachments || []).map(async (attachment) => {
      if (!attachment?.file) return null

      const bucketMap = {
        Project: 'project-files',
        Image: 'post-images',
        Code: 'project-files',
      }

      const folderMap = { Project: 'project', Image: 'post', Code: 'code' }
      const url = await uploadStorageFile({
        bucket: bucketMap[attachment.kind] || 'project-files',
        clerkUserId,
        file: attachment.file,
        folderName: folderMap[attachment.kind] || 'files',
      })

      return { ...attachment, url, bucket: bucketMap[attachment.kind] || 'project-files' }
    }),
  )

  const uploadedFiles = uploadResults.filter((attachment) => attachment?.url)
  if (uploadedFiles.length) {
    const { error: attachmentError } = await supabase.from('post_attachments').insert(
      uploadedFiles.map((attachment) => ({
        post_id: data.id,
        clerk_user_id: clerkUserId,
        bucket: attachment.bucket,
        name: attachment.name,
        kind: attachment.kind,
        url: attachment.url,
      })),
    )

    if (attachmentError) console.error('Post attachment metadata failed:', attachmentError)
  }

  return {
    ...data,
    uploadedFiles,
  }
}

export async function updateCommunityPost({ postId, clerkUserId, content, projectId = null, postType, attachments = [], keepImageUrls = [], removeImageUrls = [] }) {
  if (!postId || !clerkUserId || !hasSupabaseConfig) return null

  const payload = {
    content: typeof content === 'string' ? content : '',
    project_id: projectId ?? null,
  }

  if (postType) payload.post_type = ['project', 'question', 'achievement', 'discussion'].includes(postType) ? postType : 'discussion'

  const { data, error } = await supabase
    .from('posts')
    .update(payload)
    .eq('id', postId)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single()

  if (error) {
    console.error('Post update failed:', error)
    return null
  }

  const { data: existingAttachments = [], error: attachmentLookupError } = await supabase
    .from('post_attachments')
    .select('id, bucket, kind, name, url, post_id, clerk_user_id')
    .eq('post_id', postId)
    .eq('clerk_user_id', clerkUserId)

  if (attachmentLookupError) {
    console.error('Post attachment lookup failed:', attachmentLookupError)
  }

  const keepUrls = new Set((keepImageUrls || []).filter(Boolean))
  const removeUrls = new Set((removeImageUrls || []).filter(Boolean))
  const attachmentsToDelete = (existingAttachments || []).filter((attachment) => {
    if (attachment.kind === 'Image' && (removeUrls.has(attachment.url) || (!keepUrls.has(attachment.url) && attachment.url && !attachments.some((nextAttachment) => nextAttachment?.url === attachment.url)))) {
      return true
    }
    return false
  })

  if (attachmentsToDelete.length) {
    const deletePromises = attachmentsToDelete.map(async (attachment) => {
      const storagePath = extractStoragePathFromUrl(attachment.url, attachment.bucket)
      if (storagePath) {
        const { error: removeError } = await supabase.storage.from(attachment.bucket).remove([storagePath])
        if (removeError) {
          console.error('Storage cleanup failed for attachment:', removeError)
        }
      }

      const { error: rowDeleteError } = await supabase.from('post_attachments').delete().eq('id', attachment.id).eq('clerk_user_id', clerkUserId)
      if (rowDeleteError) console.error('Attachment row cleanup failed:', rowDeleteError)
    })

    await Promise.all(deletePromises)
  }

  for (const attachment of attachments || []) {
    if (!attachment?.file) continue

    const bucket = attachment.kind === 'Image' ? 'post-images' : attachment.kind === 'Code' ? 'project-files' : 'project-files'
    const folderName = attachment.kind === 'Image' ? 'post' : attachment.kind === 'Code' ? 'code' : 'project'
    const url = await uploadStorageFile({
      bucket,
      clerkUserId,
      file: attachment.file,
      folderName,
    })

    if (!url) continue

    const { error: attachmentInsertError } = await supabase.from('post_attachments').insert({
      post_id: postId,
      clerk_user_id: clerkUserId,
      bucket,
      name: attachment.name || 'attachment',
      kind: attachment.kind || 'Project',
      url,
    })

    if (attachmentInsertError) console.error('Post attachment insert failed:', attachmentInsertError)
  }

  return data
}

function extractStoragePathFromUrl(url, bucketName) {
  if (!url || !bucketName) return null

  try {
    const parsedUrl = new URL(url)
    const prefix = `/storage/v1/object/public/${bucketName}/`
    const pathname = decodeURIComponent(parsedUrl.pathname)
    if (!pathname.includes(prefix)) return null
    return pathname.slice(pathname.indexOf(prefix) + prefix.length)
  } catch (error) {
    return null
  }
}

export async function deleteCommunityPost({ postId, clerkUserId }) {
  if (!postId || !clerkUserId || !hasSupabaseConfig) return false

  const { data: attachments = [], error: attachmentLookupError } = await supabase
    .from('post_attachments')
    .select('id, bucket, kind, name, url')
    .eq('post_id', postId)
    .eq('clerk_user_id', clerkUserId)

  if (attachmentLookupError) {
    console.error('Post attachment lookup before delete failed:', attachmentLookupError)
  }

  if (attachments.length) {
    for (const attachment of attachments) {
      const storagePath = extractStoragePathFromUrl(attachment.url, attachment.bucket)
      if (storagePath) {
        const { error: removeError } = await supabase.storage.from(attachment.bucket).remove([storagePath])
        if (removeError) {
          console.error('Storage cleanup failed during post delete:', removeError)
        }
      }
    }
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('clerk_user_id', clerkUserId)

  if (error) {
    console.error('Post deletion failed:', error)
    return false
  }

  return true
}

export async function fetchCommunityPosts({ clerkUserId, likedBy } = {}) {
  if (!hasSupabaseConfig || (clerkUserId !== undefined && !clerkUserId)) return []

  let postsQuery = supabase
    .from('posts')
    .select('*')
  if (clerkUserId) postsQuery = postsQuery.eq('clerk_user_id', clerkUserId)

  const { data: postsData, error: postsError } = await postsQuery.order('created_at', { ascending: false })

  if (postsError) {
    console.error('Fetch posts failed:', postsError)
    return []
  }

  if (!postsData?.length) return []

  const clerkIds = [...new Set(postsData.map((post) => post.clerk_user_id))]
  const { data: profilesData } = await supabase.from('profiles').select('*').in('clerk_user_id', clerkIds)
  const profiles = new Map((profilesData || []).map((profile) => [profile.clerk_user_id, profile]))

  const postIds = postsData.map((post) => post.id)
  const { data: likesData } = await supabase.from('post_likes').select('post_id').in('post_id', postIds)
  const likeCounts = new Map()
  ;(likesData || []).forEach((like) => {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1)
  })

  const { data: commentsData } = await supabase.from('comments').select('post_id').in('post_id', postIds)
  const commentCounts = new Map()
  ;(commentsData || []).forEach((comment) => {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1)
  })

  const { data: attachmentData } = await supabase.from('post_attachments').select('post_id, name, kind, url').in('post_id', postIds)
  const attachmentsByPost = new Map()
  ;(attachmentData || []).forEach((attachment) => {
    const current = attachmentsByPost.get(attachment.post_id) || []
    attachmentsByPost.set(attachment.post_id, [...current, attachment])
  })

  const { data: repostData } = await supabase.from('post_reposts').select('post_id, clerk_user_id').in('post_id', postIds)
  const repostCounts = new Map()
  const myReposts = new Set()
  ;(repostData || []).forEach((repost) => {
    repostCounts.set(repost.post_id, (repostCounts.get(repost.post_id) || 0) + 1)
    if (likedBy && repost.clerk_user_id === likedBy) myReposts.add(repost.post_id)
  })

  let likedByMeSet = new Set()
  if (likedBy && postIds.length) {
    const { data: likedByData } = await supabase.from('post_likes').select('post_id').in('post_id', postIds).eq('clerk_user_id', likedBy)
    likedByMeSet = new Set((likedByData || []).map((like) => like.post_id))
  }

  const projectIds = [...new Set(postsData.map((post) => post.project_id).filter(Boolean))]
  const projectsById = new Map()
  if (projectIds.length) {
    const { data: projectRows, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, language')
      .in('id', projectIds)

    if (projectsError) {
      console.error('Fetch attached projects failed:', projectsError)
    } else {
      const { data: projectFiles, error: projectFilesError } = await supabase
        .from('project_files')
        .select('id, project_id, name, path, content, language')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true })

      if (projectFilesError) console.error('Fetch attached project files failed:', projectFilesError)

      const filesByProject = new Map()
      ;(projectFiles || []).forEach((file) => {
        const current = filesByProject.get(file.project_id) || []
        filesByProject.set(file.project_id, [...current, file])
      })

      ;(projectRows || []).forEach((project) => {
        projectsById.set(project.id, {
          ...project,
          files: filesByProject.get(project.id) || [],
        })
      })
    }
  }

  return postsData.map((post) => {
    const profile = profiles.get(post.clerk_user_id) || {}
    const postType = post.post_type || 'discussion'

    return {
      id: post.id,
      clerkUserId: post.clerk_user_id,
      createdAt: post.created_at,
      user: profile.username || 'CodeCraft Member',
      initials: buildInitials(profile.username || 'CodeCraft Member'),
      color: '#2388ff',
      level: 'Student',
      time: formatRelativeTime(post.created_at),
      category: postType.toUpperCase(),
      title: `${postType.charAt(0).toUpperCase()}${postType.slice(1)} post`,
      description: post.content || '',
      tags: [],
      likes: likeCounts.get(post.id) || 0,
      likedByMe: likedByMeSet.has(post.id),
      comments: commentCounts.get(post.id) || 0,
      reposts: repostCounts.get(post.id) || 0,
      repostedByMe: myReposts.has(post.id),
      action: 'View Post',
      type: postType === 'project' ? 'Projects' : postType === 'question' ? 'Questions' : postType === 'achievement' ? 'Challenges' : 'Questions',
      preview: postType === 'project' ? 'portfolio' : postType === 'question' ? 'code' : 'challenge',
      avatar: profile.avatar_url || '',
      projectId: post.project_id || null,
      project: projectsById.get(post.project_id) || null,
      attachments: attachmentsByPost.get(post.id) || [],
      postType,
    }
  })
}

export async function togglePostLike(postId, clerkUserId) {
  if (!postId || !clerkUserId || !hasSupabaseConfig) return null

  const { data: existingLike, error: checkError } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (checkError) {
    console.error('Like lookup failed:', checkError)
    return null
  }

  if (existingLike) {
    const { error } = await supabase.from('post_likes').delete().eq('id', existingLike.id)
    if (error) console.error('Unlike failed:', error)
    return { liked: false }
  }

  const { error } = await supabase.from('post_likes').insert({ post_id: postId, clerk_user_id: clerkUserId })
  if (error) {
    console.error('Like failed:', error)
    return null
  }

  return { liked: true }
}

export async function addCommentToPost(postId, clerkUserId, content) {
  if (!postId || !clerkUserId || !content || !hasSupabaseConfig) return null

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, clerk_user_id: clerkUserId, content })
    .select()
    .single()

  if (error) {
    console.error('Comment create failed:', error)
    return null
  }

  return data
}

export async function saveProjectToSupabase({ clerkUserId, title, description, code, language, projectFile, previewImage }) {
  if (!clerkUserId || !hasSupabaseConfig) return null

  const fileUrl = projectFile ? await uploadStorageFile({ bucket: 'project-files', clerkUserId, file: projectFile, folderName: title || 'project' }) : null
  const previewImageUrl = previewImage ? await uploadStorageFile({ bucket: 'project-previews', clerkUserId, file: previewImage, folderName: 'preview' }) : null

  return createProjectRecord({
    clerkUserId,
    title,
    description,
    code,
    language,
    fileUrl,
    previewImageUrl,
  })
}

export async function syncEditorProjectToSupabase({ clerkUserId, project }) {
  if (!clerkUserId || !project) throw new Error('A signed-in user and project are required.')
  if (!hasSupabaseConfig) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')

  const code = (project.files || [])
    .map((file) => `/* ${file.path || file.name} */\n${file.content || ''}`)
    .join('\n\n')

  const { data, error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      clerk_user_id: clerkUserId,
      title: project.name || 'Untitled project',
      description: 'CodeCraft editor project',
      code,
      language: project.language || project.files?.[0]?.language || 'HTML',
      updated_at: project.updatedAt || new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchPostComments(postId) {
  if (!postId || !hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, clerk_user_id, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch comments failed:', error)
    return []
  }
  if (!data?.length) return []

  const clerkIds = [...new Set(data.map((comment) => comment.clerk_user_id))]
  const { data: profilesData } = await supabase.from('profiles').select('clerk_user_id, username, avatar_url').in('clerk_user_id', clerkIds)
  const profiles = new Map((profilesData || []).map((profile) => [profile.clerk_user_id, profile]))

  return data.map((comment) => {
    const profile = profiles.get(comment.clerk_user_id) || {}
    const name = profile.username || 'CodeCraft Member'
    return {
      id: comment.id,
      postId: comment.post_id,
      clerkUserId: comment.clerk_user_id,
      content: comment.content,
      createdAt: comment.created_at,
      user: name,
      initials: buildInitials(name),
      avatar: profile.avatar_url || '',
    }
  })
}

export async function fetchOriginalPostPreview(postIds) {
  const ids = [...new Set((postIds || []).filter(Boolean).map(String))]
  if (!ids.length || !hasSupabaseConfig) return new Map()

  const { data, error } = await supabase
    .from('posts')
    .select('id, clerk_user_id, post_type, content, created_at, project_id')
    .in('id', ids)

  if (error) {
    console.error('Fetch original posts failed:', error)
    return new Map()
  }
  if (!data?.length) return new Map()

  const clerkIds = [...new Set(data.map((post) => post.clerk_user_id))]
  const { data: profilesData } = await supabase.from('profiles').select('clerk_user_id, username, avatar_url').in('clerk_user_id', clerkIds)
  const profiles = new Map((profilesData || []).map((profile) => [profile.clerk_user_id, profile]))

  const previews = new Map()
  data.forEach((post) => {
    const profile = profiles.get(post.clerk_user_id) || {}
    const postType = post.post_type || 'discussion'
    previews.set(post.id, {
      id: post.id,
      clerkUserId: post.clerk_user_id,
      postType,
      content: post.content || '',
      createdAt: post.created_at,
      user: profile.username || 'CodeCraft Member',
      initials: buildInitials(profile.username || 'CodeCraft Member'),
      avatar: profile.avatar_url || '',
      category: postType.toUpperCase(),
      title: `${postType.charAt(0).toUpperCase()}${postType.slice(1)} post`,
    })
  })
  return previews
}

export async function togglePostRepost({ postId, clerkUserId, thought }) {
  if (!postId || !clerkUserId || !hasSupabaseConfig) return null

  const { data: existing, error: checkError } = await supabase
    .from('post_reposts')
    .select('id')
    .eq('post_id', postId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (checkError) {
    console.error('Repost lookup failed:', checkError)
    return null
  }

  if (existing) {
    const { error } = await supabase.from('post_reposts').delete().eq('id', existing.id)
    if (error) {
      console.error('Undo repost failed:', error)
      return null
    }
    return { reposted: false }
  }

  const trimmedThought = typeof thought === 'string' ? thought.trim() : ''
  const { data, error } = await supabase
    .from('post_reposts')
    .insert({ post_id: postId, clerk_user_id: clerkUserId, thought: trimmedThought || null })
    .select('id')
    .single()

  if (error) {
    console.error('Repost failed:', error)
    return null
  }

  return { reposted: true, id: data?.id || null }
}

export async function fetchRecentReposts() {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('post_reposts')
    .select('id, post_id, clerk_user_id, thought, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Fetch reposts failed:', error)
    return []
  }
  if (!data?.length) return []

  const clerkIds = [...new Set(data.map((repost) => repost.clerk_user_id))]
  const { data: profilesData } = await supabase.from('profiles').select('clerk_user_id, username, avatar_url').in('clerk_user_id', clerkIds)
  const profiles = new Map((profilesData || []).map((profile) => [profile.clerk_user_id, profile]))

  return data.map((repost) => {
    const profile = profiles.get(repost.clerk_user_id) || {}
    const name = profile.username || 'CodeCraft Member'
    return {
      id: repost.id,
      postId: repost.post_id,
      clerkUserId: repost.clerk_user_id,
      thought: repost.thought || '',
      createdAt: repost.created_at,
      user: name,
      initials: buildInitials(name),
      avatar: profile.avatar_url || '',
    }
  })
}
