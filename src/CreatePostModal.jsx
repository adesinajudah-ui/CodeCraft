import { useEffect, useRef, useState } from 'react'
import { Code2, Image as ImageIcon, Paperclip, Smile, UploadCloud, X } from 'lucide-react'
import { hasSupabaseConfig, supabase } from './lib/supabase'

const postTypeOptions = [
  { value: 'Project', label: 'Project', icon: '▣' },
  { value: 'Question', label: 'Question', icon: '?' },
  { value: 'Achievement', label: 'Achievement', icon: '🏆' },
  { value: 'Discussion', label: 'Discussion', icon: '✦' },
]

const suggestedTags = ['#javascript', '#react', '#webdev']

function buildInitials(name) {
  if (!name) return 'CC'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function CreatePostModal({ open, onClose, currentUser, displayName, onPublish, onSave, mode = 'create', initialPost = null }) {
  const overlayRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [content, setContent] = useState('')
  const [selectedType, setSelectedType] = useState('Project')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [userProjects, setUserProjects] = useState([])
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)
  const [projectLoaderError, setProjectLoaderError] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [pendingAttachmentType, setPendingAttachmentType] = useState('Project')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const isEditMode = mode === 'edit'

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setContent('')
      setSelectedType('Project')
      setTags([])
      setTagInput('')
      setAttachments([])
      setSelectedImage(null)
      setSelectedProjectId(null)
      setUserProjects([])
      setIsProjectPickerOpen(false)
      setProjectLoaderError('')
      setValidationMessage('')
      setPendingAttachmentType('Project')
      setIsSubmitting(false)
      setShowSuccess(false)
      return
    }

    if (isEditMode && initialPost) {
      const nextType = initialPost.postType ? {
        project: 'Project',
        question: 'Question',
        achievement: 'Achievement',
        discussion: 'Discussion',
      }[initialPost.postType] || 'Project' : 'Project'
      const imageAttachments = (initialPost.attachments || []).filter((attachment) => attachment?.kind === 'Image' || attachment?.url?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i))
      const existingImage = imageAttachments[0] || null

      setContent(initialPost.description || '')
      setSelectedType(nextType)
      setTags(Array.isArray(initialPost.tags) ? initialPost.tags : [])
      setSelectedProjectId(initialPost.projectId || null)
      setAttachments((initialPost.attachments || []).filter((attachment) => attachment && !((attachment.kind === 'Image' || attachment.url?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i)))))
      setSelectedImage(existingImage ? {
        id: existingImage.id || `existing-${existingImage.url || Date.now()}`,
        previewUrl: existingImage.url,
        name: existingImage.name || 'Existing image',
        isExisting: true,
        existingUrl: existingImage.url,
      } : null)
      setValidationMessage('')
      return
    }

    setContent('')
    setSelectedType('Project')
    setTags([])
    setTagInput('')
    setAttachments([])
    setSelectedImage(null)
    setSelectedProjectId(null)
    setValidationMessage('')
    setPendingAttachmentType('Project')
    setShowSuccess(false)
  }, [open, initialPost, isEditMode])

  useEffect(() => {
    if (!open || !hasSupabaseConfig || !currentUser?.id) {
      setUserProjects([])
      setProjectLoaderError('')
      return undefined
    }

    let isCancelled = false

    const loadProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (isCancelled) return
      if (error) {
        console.error('Community project query failed:', error)
        setProjectLoaderError('Unable to load your projects right now.')
        setUserProjects([])
        return
      }

      const projects = (data || []).filter((project) => {
        const owner = project.clerk_user_id || project.user_id
        return owner === currentUser.id
      })

      let filesByProject = new Map()
      if (projects.length) {
        const { data: projectFiles, error: filesError } = await supabase
          .from('project_files')
          .select('*')
          .in('project_id', projects.map((project) => project.id))
          .order('created_at', { ascending: true })

        if (filesError) {
          console.error('Project files could not be loaded for Community:', filesError)
        } else {
          const validProjectFiles = (projectFiles || []).filter((file) => {
            const owner = file.clerk_user_id || file.user_id
            return owner === currentUser.id || !owner
          })

          filesByProject = validProjectFiles.reduce((filesById, file) => {
            const projectFilesForId = filesById.get(file.project_id) || []
            filesById.set(file.project_id, [...projectFilesForId, file])
            return filesById
          }, new Map())
        }
      }

      setUserProjects(projects.map((project) => ({
        ...project,
        title: project.title || project.name || 'Untitled project',
        files: filesByProject.get(project.id) || [],
      })))
      setProjectLoaderError('')
    }

    loadProjects().catch((error) => {
      if (!isCancelled) {
        console.error('Community project loading failed:', error)
        setProjectLoaderError('Unable to load your projects right now.')
        setUserProjects([])
      }
    })

    return () => {
      isCancelled = true
    }
  }, [open, currentUser?.id])

  if (!open) return null

  const username = displayName || currentUser?.firstName || 'CodeCraft Member'
  const userInitials = buildInitials(username)

  const addTag = (rawTag) => {
    const nextTag = (rawTag || tagInput).trim()
    if (!nextTag) return

    const sanitized = nextTag.startsWith('#') ? nextTag : `#${nextTag}`
    if (!tags.includes(sanitized)) {
      setTags((current) => [...current, sanitized])
    }
    setTagInput('')
  }

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const mapped = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      file,
      type: pendingAttachmentType.toLowerCase(),
      kind: pendingAttachmentType,
    }))

    setAttachments((current) => [...current, ...mapped])
    setValidationMessage('')
    event.target.value = ''
  }

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name)
    const maxSizeBytes = 5 * 1024 * 1024

    if (!isValidType) {
      setValidationMessage('Please choose a valid image file: JPG, PNG, WEBP, or GIF.')
      event.target.value = ''
      return
    }

    if (file.size > maxSizeBytes) {
      setValidationMessage('Image is too large. Please choose an image under 5MB.')
      event.target.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedImage({ id: `${file.name}-${file.size}-${Date.now()}`, file, previewUrl: objectUrl, name: file.name })
    setValidationMessage('')
    event.target.value = ''
  }

  const handleRemoveSelectedImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl)
    }
    setSelectedImage(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handlePublish = async () => {
    const trimmed = content.trim()
    if (!trimmed && attachments.length === 0 && !selectedImage) {
      setValidationMessage('Please add a message or attach a project, image, or code before publishing.')
      return
    }

    if (isSubmitting) return

    setValidationMessage('')
    setIsSubmitting(true)

    const typeMap = {
      Project: 'Projects',
      Question: 'Questions',
      Achievement: 'Challenges',
      Discussion: 'Questions',
    }

    const typeActionMap = {
      Project: 'View Project',
      Question: 'View Answers',
      Achievement: 'View Achievement',
      Discussion: 'Join Discussion',
    }

    const titleText = trimmed ? trimmed.split(/\s+/).slice(0, 10).join(' ') : `${selectedType} update`

    const normalizedAttachments = selectedImage && selectedImage.file
      ? [{
          id: selectedImage.id,
          name: selectedImage.name,
          file: selectedImage.file,
          kind: 'Image',
          type: 'image',
        }, ...attachments]
      : attachments

    const existingImageUrls = isEditMode && initialPost?.attachments
      ? (initialPost.attachments.filter((attachment) => attachment?.kind === 'Image' || attachment?.url?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i)).map((attachment) => attachment.url).filter(Boolean))
      : []

    const keepImageUrls = isEditMode && selectedImage && selectedImage.isExisting && selectedImage.existingUrl ? [selectedImage.existingUrl] : []
    const removeImageUrls = isEditMode ? (selectedImage && selectedImage.isExisting ? [] : existingImageUrls) : []

    const nextPost = {
      id: initialPost?.id || `community-${Date.now()}`,
      createdAt: initialPost?.createdAt || new Date().toISOString(),
      postType: selectedType.toLowerCase(),
      user: username,
      initials: userInitials,
      color: '#2388ff',
      level: currentUser?.username ? 'Pro' : 'Student',
      time: 'Just now',
      category: selectedType.toUpperCase(),
      title: titleText.length > 72 ? `${titleText.slice(0, 69)}...` : titleText,
      description: trimmed,
      tags: tags.length ? tags : ['#community'],
      likes: initialPost?.likes || 0,
      comments: initialPost?.comments || 0,
      action: typeActionMap[selectedType],
      type: typeMap[selectedType],
      preview: selectedType === 'Project' ? 'portfolio' : selectedType === 'Question' ? 'code' : 'challenge',
      attachments: normalizedAttachments,
      projectId: selectedProjectId || null,
      project: userProjects.find((project) => project.id === selectedProjectId) || initialPost?.project || null,
      keepImageUrls,
      removeImageUrls,
      updatedAt: new Date().toISOString(),
    }

    try {
      const saveHandler = isEditMode ? onSave : onPublish
      const didSave = saveHandler ? await saveHandler(nextPost) : false
      if (!didSave) {
        setValidationMessage(isEditMode ? 'Unable to save your changes right now. Please try again.' : 'Unable to create your post right now. Please try again.')
        setIsSubmitting(false)
        return
      }

      setShowSuccess(true)
      setIsSubmitting(false)
      window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch (error) {
      setValidationMessage(error?.message || (isEditMode ? 'Unable to save your changes right now. Please try again.' : 'Unable to create your post right now. Please try again.'))
      setIsSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="community-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose()
        }
      }}
    >
      <div className="community-create-post-modal" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
        <div className="community-modal-header">
          <h2 id="create-post-title">{isEditMode ? 'Edit Post' : 'Create a Post'}</h2>
          <button type="button" className="community-modal-close" aria-label="Close create post modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="community-user-row">
          <div className="community-user-meta">
            <div className="community-user-avatar" aria-label="Current user avatar">
              {currentUser?.imageUrl ? <img src={currentUser.imageUrl} alt={username} /> : userInitials}
            </div>
            <div className="community-user-copy">
              <strong>{username}</strong>
              <span>Student</span>
            </div>
          </div>

          <button type="button" className="community-audience-button">
            Everyone <span>▼</span>
          </button>
        </div>

        <label className="community-post-label" htmlFor="community-post-content">
          <textarea
            id="community-post-content"
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 2000))}
            maxLength={2000}
            placeholder="Share something with the CodeCraft community..."
          />
        </label>

        <div className="community-character-row">
          <span>{content.length}/2000</span>
        </div>

        <div className="community-post-type-options" aria-label="Post type options">
          {postTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`community-post-type ${selectedType === option.value ? 'is-active' : ''}`}
              onClick={() => setSelectedType(option.value)}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {selectedType === 'Project' && (
          <div className="community-project-form">
            <label className="community-upload-label">Add project, image or code (optional)</label>

            {selectedImage ? (
              <div className="community-image-preview-wrapper">
                <div className="community-image-preview-container">
                  <img src={selectedImage.previewUrl} alt={selectedImage.name} className="community-image-preview" />
                  <button type="button" className="community-image-remove" onClick={handleRemoveSelectedImage} aria-label="Remove selected image">×</button>
                </div>
              </div>
            ) : (
              <div className="community-upload-zone" onClick={() => {
                setPendingAttachmentType('Project')
                imageInputRef.current?.click()
              }}>
                <UploadCloud size={26} />
                <strong>Add project, image, or code snippet</strong>
                <span>Drag and drop files here, or click to browse</span>
              </div>
            )}

            <div className="community-attachment-actions">
              <button type="button" className="community-mini-action" onClick={() => {
                setPendingAttachmentType('Project')
                setIsProjectPickerOpen((current) => !current)
              }}>
                Upload Project
              </button>
              <button type="button" className="community-mini-action" onClick={() => {
                setPendingAttachmentType('Code')
                fileInputRef.current?.click()
              }}>
                Add Code
              </button>
              <button type="button" className="community-mini-action" onClick={() => {
                setPendingAttachmentType('Image')
                imageInputRef.current?.click()
              }}>
                Add Image
              </button>
            </div>

            {isProjectPickerOpen && (
              <div className="community-project-picker">
                <div className="community-project-picker-header">
                  <strong>Select a project</strong>
                  <button type="button" className="community-project-picker-close" onClick={() => setIsProjectPickerOpen(false)} aria-label="Close project picker">×</button>
                </div>

                {projectLoaderError ? (
                  <p className="community-validation-message">{projectLoaderError}</p>
                ) : userProjects.length === 0 ? (
                  <p className="community-empty-projects">No projects found for this account.</p>
                ) : (
                  <div className="community-project-list">
                    {userProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className={`community-project-option ${selectedProjectId === project.id ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedProjectId(project.id)
                          setIsProjectPickerOpen(false)
                        }}
                      >
                        <span className="community-project-option-title">{project.title || 'Untitled project'}</span>
                        <span className="community-project-option-meta">{project.language || 'HTML'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedProjectId && userProjects.length > 0 && (
              <div className="community-selected-project-card">
                <div className="community-selected-project-copy">
                  <span className="community-selected-project-label">Attached Project</span>
                  <strong>{userProjects.find((project) => project.id === selectedProjectId)?.title || 'Untitled project'}</strong>
                  <small>{userProjects.find((project) => project.id === selectedProjectId)?.language || 'HTML'}</small>
                </div>
                <button type="button" className="community-project-remove" onClick={() => setSelectedProjectId(null)} aria-label="Remove selected project">Remove</button>
              </div>
            )}
          </div>
        )}

        <div className="community-tags-block">
          <label htmlFor="community-tag-input">Tags (optional)</label>
          <input
            id="community-tag-input"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addTag()
              }
            }}
            placeholder="Add tags (e.g. #javascript, #react, #webdev...)"
          />

          <div className="community-tag-suggestions">
            {suggestedTags.map((tag) => (
              <button key={tag} type="button" className="community-tag-suggestion" onClick={() => addTag(tag)}>
                {tag}
              </button>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="community-selected-tags">
              {tags.map((tag) => (
                <span key={tag} className="community-selected-tag">
                  {tag}
                  <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags((current) => current.filter((item) => item !== tag))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="community-modal-footer">
          <div className="community-toolbar-icons" aria-label="Post utilities">
            <button type="button" aria-label="Add emoji"><Smile size={16} /></button>
            <button type="button" aria-label="Add code"><Code2 size={16} /></button>
            <button type="button" aria-label="Add image"><ImageIcon size={16} /></button>
            <button type="button" aria-label="Add attachment"><Paperclip size={16} /></button>
          </div>

          <div className="community-modal-actions">
            <button type="button" className="community-secondary-button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button
              type="button"
              className="button community-primary-button community-post-submit-button"
              onClick={handlePublish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="community-post-submit-spinner" aria-hidden="true" />
                  <span>Posting...</span>
                </>
              ) : showSuccess ? (
                <>
                  <span className="community-post-success-indicator" aria-hidden="true">✓</span>
                  <span>{isEditMode ? 'Saved' : 'Posted'}</span>
                </>
              ) : (
                isEditMode ? '💾 Save Changes' : '🚀 Publish Post'
              )}
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="community-post-success-state" role="status" aria-live="polite">
            <div className="community-post-success-icon" aria-hidden="true">✓</div>
            <span>{isEditMode ? 'Post updated successfully' : 'Posted successfully'}</span>
          </div>
        )}

        {validationMessage && <p className="community-validation-message">{validationMessage}</p>}

        <input
          ref={imageInputRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelection}
        />

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={pendingAttachmentType === 'Image' ? 'image/*' : pendingAttachmentType === 'Code' ? '.js,.jsx,.ts,.tsx,.py,.css,.html,.json,.md,.txt' : '.zip,.rar,.7z,.pdf,.png,.jpg,.jpeg,.svg,.gif,.webp,.txt,.js,.jsx,.ts,.tsx,.css,.html,.json,.md'}
          multiple={pendingAttachmentType !== 'Project' || true}
          onChange={handleFileSelection}
        />
      </div>

      <style>{`
        .community-post-submit-button {
          min-width: 168px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .community-post-submit-button:disabled {
          opacity: 0.82;
          cursor: not-allowed;
          transform: none;
        }

        .community-post-submit-spinner {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          animation: community-post-spin 0.75s linear infinite;
          display: inline-block;
        }

        .community-post-success-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .community-post-success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 12px 4px;
          color: #dcfce7;
          animation: community-post-fade-up 0.3s ease-out;
        }

        .community-post-success-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: grid;
          place-items: center;
          font-size: 27px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.36);
          animation: community-post-success-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .community-image-preview-wrapper {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }

        .community-image-preview-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.6);
        }

        .community-image-preview {
          display: block;
          width: 100%;
          height: auto;
          max-height: 220px;
          object-fit: contain;
          background: #edf2f7;
        }

        .community-image-remove,
        .community-project-remove,
        .community-project-picker-close {
          appearance: none;
          border: none;
          cursor: pointer;
          font: inherit;
        }

        .community-image-remove {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.78);
          color: #fff;
          font-size: 18px;
          line-height: 1;
        }

        .community-project-picker {
          margin-top: 12px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.72);
          padding: 12px;
        }

        .community-project-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          color: #e2e8f0;
        }

        .community-project-picker-close {
          background: transparent;
          color: #cbd5e1;
          font-size: 22px;
          line-height: 1;
        }

        .community-project-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 220px;
          overflow: auto;
        }

        .community-project-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.45);
          color: #e2e8f0;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
        }

        .community-project-option.is-selected {
          border-color: rgba(96, 165, 250, 0.9);
          background: rgba(30, 64, 175, 0.2);
        }

        .community-project-option-title {
          font-weight: 600;
        }

        .community-project-option-meta {
          color: #94a3b8;
          font-size: 12px;
        }

        .community-empty-projects {
          margin: 0;
          color: #cbd5e1;
          font-size: 13px;
        }

        .community-selected-project-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          border: 1px solid rgba(96, 165, 250, 0.35);
          background: rgba(30, 64, 175, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .community-selected-project-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: #e2e8f0;
        }

        .community-selected-project-label {
          font-size: 11px;
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .community-project-remove {
          background: transparent;
          color: #f8fafc;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        @keyframes community-post-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes community-post-fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes community-post-success-pop {
          0% {
            opacity: 0;
            transform: scale(0.6);
          }
          60% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
