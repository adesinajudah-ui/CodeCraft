import { useEffect, useMemo, useRef, useState } from 'react'
import { ClerkProvider, SignIn, SignUp, UserButton, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { Folder, Pencil, Trash2 } from 'lucide-react'
import { categories, features, recommendations } from './data'
import CourseSearch from './CourseSearch'
import { courseCatalog } from './course-search-data'
import './App.css'
import './editor-theme.css'
import './home-page.css'
import './landing-header.css'
import './landing-theme.css'
import './typography.css'
import './clerk-auth.css'
import './community-page.css'
import './profile-page.css'
import './global-scroll.css'
import './learning-features.css'
import './sidebar-compact.css'
import AdminHeaderAction from './AdminHeaderAction'
import { NotificationBell, NotificationProvider } from './NotificationSystem'
import MobileNavigation from './MobileNavigation'
import CreatePostModal from './CreatePostModal'
import AdminControlCenter from './AdminControlCenter'
import { AnnouncementStrip, CertificatesPage, ChallengesPage, ManagedCourseList, QuizzesPage, UpcomingChallenges } from './LearningFeatures'
import { ChallengeSidebarContext } from './ChallengeSystem'
import { configureSupabaseAccessToken, createCommunityPost, deleteCommunityPost, ensureProfileFromClerk, fetchCommunityPosts, fetchPostComments, fetchPublicSiteSettings, fetchRecentReposts, getClerkUserId, hasSupabaseConfig, isUserAccountActive, isUserAdmin, supabase, togglePostLike, togglePostRepost, updateCommunityPost, updateUserAdminRole } from './lib/supabase'
import { buildCourseProgress, buildOverallProgress, buildQuizStats, buildRecentActivityFromEvents, buildStreak, formatActivityDate, selectContinueLearning } from './lib/home-progress'
import { fetchHomeDashboard } from './lib/home-progress-data'
import './responsive-layout.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const learningCourses = [
  { title: 'Web Development', progress: 100, lessons: 12, description: 'Build responsive websites with modern HTML and CSS.' },
  { title: 'JavaScript', progress: 76, lessons: 10, description: 'Learn the fundamentals and build interactive web pages.' },
  { title: 'React Fundamentals', progress: 42, lessons: 9, description: 'Build modern interfaces with components and hooks.' },
  { title: 'Python Basics', progress: 0, lessons: 8, description: 'Learn a versatile language for real-world projects.' },
]

const pathCourseDefaults = {
  'HTML': ['HTML', '#e56b45', 'Beginner', 8],
  'CSS': ['CSS', '#2388ff', 'Beginner', 10],
  'JavaScript': ['JS', '#f4b740', 'Beginner', 10],
  'HTML Fundamentals': ['HTML5', '#e34f26', 'Beginner', 8],
  'CSS Fundamentals': ['CSS3', '#1572b6', 'Beginner', 10],
  'JavaScript Fundamentals': ['JS', '#f0db4f', 'Beginner', 12],
  'Next.js Fundamentals': ['NEXT', '#111827', 'Intermediate', 10],
  'React Fundamentals': ['⚛', '#4e8ef7', 'Intermediate', 9],
  'Node.js Fundamentals': ['Node', '#68a063', 'Intermediate', 10],
  'Express.js Fundamentals': ['EXP', '#222222', 'Intermediate', 8],
  'REST API Development': ['API', '#1473ea', 'Intermediate', 10],
  'PHP Fundamentals': ['PHP', '#777bb4', 'Intermediate', 10],
  'Authentication & Authorization': ['AUTH', '#e56b5c', 'Advanced', 8],
  'Backend Projects': ['SERVER', '#3b7f6f', 'Advanced', 12],
  'SQL Fundamentals': ['SQL', '#1d4ed8', 'Beginner', 8],
  'MySQL Fundamentals': ['MySQL', '#00758f', 'Intermediate', 8],
  'PostgreSQL Fundamentals': ['PG', '#336791', 'Intermediate', 9],
  'MongoDB Fundamentals': ['Mongo', '#13aa52', 'Intermediate', 8],
  'Database Design': ['DB', '#ff7b54', 'Intermediate', 10],
  'Database Projects': ['DB', '#3b82f6', 'Advanced', 12],
  'Full Stack Fundamentals': ['FS', '#4f46e5', 'Beginner', 10],
  'Frontend & Backend Integration': ['FE/BE', '#2563eb', 'Intermediate', 10],
  'Database Integration': ['DB', '#1d4ed8', 'Intermediate', 10],
  'REST API Integration': ['API', '#1473ea', 'Intermediate', 10],
  'Deployment & Hosting': ['DEP', '#0ea5e9', 'Intermediate', 9],
  'Full Stack Projects': ['FS', '#111827', 'Advanced', 12],
  'AI Fundamentals': ['AI', '#7d5dfd', 'Beginner', 8],
  'Python for AI': ['Py', '#4e8ef7', 'Intermediate', 9],
  'AI Concepts & Applications': ['AI', '#8b5cf6', 'Intermediate', 9],
  'Generative AI Fundamentals': ['Gen', '#7c3aed', 'Beginner', 8],
  'Prompt Engineering': ['PROMPT', '#a78bfa', 'Intermediate', 8],
  'LLM Fundamentals': ['LLM', '#8b5cf6', 'Intermediate', 9],
  'AI API Integration': ['API', '#4f46e5', 'Intermediate', 8],
  'Python for Machine Learning': ['Py', '#4e8ef7', 'Intermediate', 10],
  'Data Preparation': ['DATA', '#3fbf74', 'Intermediate', 8],
  'Supervised Learning': ['ML', '#22c55e', 'Intermediate', 9],
  'Unsupervised Learning': ['ML', '#16a34a', 'Intermediate', 9],
  'Model Evaluation': ['ML', '#10b981', 'Advanced', 8],
  'Machine Learning Projects': ['ML', '#0f766e', 'Advanced', 10],
  'AI Automation Fundamentals': ['AI', '#7d5dfd', 'Beginner', 8],
  'AI Workflows': ['WF', '#8b5cf6', 'Intermediate', 8],
  'AI Agents': ['AGT', '#7c3aed', 'Advanced', 8],
  'Automation Projects': ['AUTO', '#0f172a', 'Advanced', 9],
  'Java for Android': ['Java', '#e26d5c', 'Intermediate', 8],
  'Kotlin Fundamentals': ['K', '#7c3aed', 'Intermediate', 8],
  'Android Development': ['AND', '#3b82f6', 'Intermediate', 10],
  'Android Projects': ['APP', '#f39d3c', 'Advanced', 10],
  'Flutter Fundamentals': ['FL', '#3ec6ff', 'Beginner', 10],
  'Dart Fundamentals': ['Dart', '#00c7ff', 'Beginner', 8],
  'Flutter UI Development': ['UI', '#3b82f6', 'Intermediate', 9],
  'Flutter Projects': ['FL', '#0ea5e9', 'Advanced', 10],
  'React Native Fundamentals': ['RN', '#61dafb', 'Beginner', 8],
  'React Native UI': ['UI', '#61dafb', 'Intermediate', 8],
  'React Native Navigation': ['NAV', '#4f46e5', 'Intermediate', 8],
  'React Native Projects': ['RN', '#0ea5e9', 'Advanced', 10],
  'Mobile App Projects': ['APP', '#f39d3c', 'Advanced', 10],
  'Python for Data Analysis': ['Py', '#4e8ef7', 'Intermediate', 9],
  'NumPy Fundamentals': ['NP', '#4e8ef7', 'Intermediate', 8],
  'Pandas Fundamentals': ['PD', '#3b82f6', 'Intermediate', 8],
  'Data Cleaning': ['DATA', '#3fbf74', 'Intermediate', 8],
  'Excel for Data Analysis': ['XL', '#1d4ed8', 'Intermediate', 8],
  'Data Analysis Projects': ['DS', '#2563eb', 'Advanced', 10],
  'Advanced SQL': ['SQL', '#1d4ed8', 'Intermediate', 9],
  'MySQL': ['MySQL', '#00758f', 'Intermediate', 8],
  'PostgreSQL': ['PG', '#336791', 'Intermediate', 8],
  'Data Visualization Fundamentals': ['VIS', '#14b8a6', 'Beginner', 8],
  'Matplotlib': ['MAT', '#0ea5e9', 'Intermediate', 8],
  'Power BI': ['PBI', '#f2c94c', 'Intermediate', 8],
  'Data Visualization Projects': ['VIS', '#0f766e', 'Advanced', 10],
  'Python for Data Science': ['Py', '#4e8ef7', 'Intermediate', 9],
  'Statistics Fundamentals': ['STAT', '#3fbf74', 'Intermediate', 9],
  'Machine Learning Fundamentals': ['ML', '#22c55e', 'Intermediate', 9],
  'Data Science Projects': ['DS', '#3fbf74', 'Advanced', 10],
  'C Fundamentals': ['C', '#5c6cff', 'Beginner', 8],
  'C Variables & Data Types': ['C', '#5c6cff', 'Beginner', 8],
  'C Control Flow': ['C', '#5c6cff', 'Intermediate', 8],
  'C Functions': ['C', '#5c6cff', 'Intermediate', 9],
  'C Pointers': ['C', '#5c6cff', 'Advanced', 8],
  'C Projects': ['C', '#5c6cff', 'Advanced', 10],
  'C++ Fundamentals': ['C++', '#5b7cff', 'Beginner', 8],
  'Object-Oriented C++': ['C++', '#5b7cff', 'Intermediate', 8],
  'C++ STL': ['CPP', '#5b7cff', 'Intermediate', 9],
  'C++ Projects': ['C++', '#5b7cff', 'Advanced', 10],
  'Java Fundamentals': ['Java', '#e26d5c', 'Beginner', 8],
  'Object-Oriented Java': ['Java', '#e26d5c', 'Intermediate', 9],
  'Java Collections': ['Java', '#e26d5c', 'Intermediate', 9],
  'Java Projects': ['Java', '#e26d5c', 'Advanced', 10],
  'Python Fundamentals': ['Py', '#4e8ef7', 'Beginner', 8],
  'Python Functions': ['Py', '#4e8ef7', 'Intermediate', 8],
  'Object-Oriented Python': ['Py', '#4e8ef7', 'Intermediate', 9],
  'Python Projects': ['Py', '#4e8ef7', 'Advanced', 10],
  'Algorithms Fundamentals': ['ALG', '#5b7cff', 'Beginner', 8],
  'Data Structures': ['DS', '#4f46e5', 'Intermediate', 8],
  'Searching & Sorting': ['ALG', '#8271ff', 'Intermediate', 9],
  'Algorithms Projects': ['ALG', '#3b82f6', 'Advanced', 10],
  'Game Development Fundamentals': ['GAME', '#e56b45', 'Beginner', 8],
  'Game Programming': ['GAME', '#e56b45', 'Intermediate', 9],
  'Game Mechanics': ['GAME', '#f97316', 'Intermediate', 8],
  'Unity Fundamentals': ['Unity', '#5c6cff', 'Beginner', 8],
  'Unity Game Development': ['Unity', '#5c6cff', 'Intermediate', 9],
  'Unity Projects': ['Unity', '#3b82f6', 'Advanced', 10],
  'C# Fundamentals': ['C#', '#9b5de5', 'Beginner', 8],
  'Object-Oriented C#': ['C#', '#9b5de5', 'Intermediate', 9],
  'C# for Game Development': ['C#', '#9b5de5', 'Intermediate', 10],
  '2D Game Project': ['2D', '#f97316', 'Advanced', 8],
  '3D Game Project': ['3D', '#f59e0b', 'Advanced', 8],
  'Final Game Project': ['GAME', '#e56b45', 'Advanced', 10],
  'Python': ['Py', '#4e8ef7', 'Beginner', 8],
  'Java': ['JA', '#e26d5c', 'Intermediate', 12],
  'C / C++': ['C++', '#5b7cff', 'Intermediate', 14],
  'Data Science': ['DS', '#3fbf74', 'Intermediate', 12],
  'Artificial Intelligence & Machine Learning': ['AI', '#7d5dfd', 'Advanced', 16],
}

const learningPaths = [
  {
    id: 'web-development', title: 'Web Development', description: 'Build websites, web applications, and modern digital experiences.', icon: '</>', color: '#2388ff', roadmap: ['HTML', 'CSS', 'JavaScript', 'React', 'Backend', 'Full Stack Project'],
    tracks: [
      { id: 'frontend', tab: 'Frontend', title: 'Frontend Development', description: 'Create beautiful and interactive user interfaces.', courses: ['HTML Fundamentals', 'CSS Fundamentals', 'JavaScript Fundamentals', 'React Fundamentals', 'Next.js Fundamentals'] },
      { id: 'backend', tab: 'Backend', title: 'Backend Development', description: 'Build powerful server-side applications, APIs, and services.', courses: ['Node.js Fundamentals', 'Express.js Fundamentals', 'REST API Development', 'PHP Fundamentals', 'Authentication & Authorization', 'Backend Projects'] },
      { id: 'database', tab: 'Database', title: 'Database Development', description: 'Learn how to store, organize, query, and manage application data.', courses: ['SQL Fundamentals', 'MySQL Fundamentals', 'PostgreSQL Fundamentals', 'MongoDB Fundamentals', 'Database Design', 'Database Projects'] },
      { id: 'full-stack', tab: 'Full Stack', title: 'Full Stack Development', description: 'Learn how frontend, backend, databases, APIs, authentication, and deployment work together.', courses: ['Full Stack Fundamentals', 'Frontend & Backend Integration', 'Database Integration', 'REST API Integration', 'Authentication & Authorization', 'Deployment & Hosting', 'Full Stack Projects'] },
    ],
  },
  {
    id: 'ai-machine-learning', title: 'AI & Machine Learning', description: 'Learn how artificial intelligence works and build intelligent applications.', icon: 'AI', color: '#7d5dfd', roadmap: ['AI Fundamentals', 'Python', 'Data Preparation', 'Machine Learning', 'Generative AI', 'AI Automation', 'AI Project'],
    tracks: [
      { id: 'ai-fundamentals', tab: 'AI Fundamentals', title: 'AI Fundamentals', description: 'Understand the foundations of AI and intelligent systems.', courses: ['AI Fundamentals', 'Python for AI', 'AI Concepts & Applications'] },
      { id: 'generative-ai', tab: 'Generative AI', title: 'Generative AI', description: 'Learn how modern generative systems produce useful outputs.', courses: ['Generative AI Fundamentals', 'Prompt Engineering', 'LLM Fundamentals', 'AI API Integration'] },
      { id: 'machine-learning', tab: 'Machine Learning', title: 'Machine Learning', description: 'Prepare data, train models, and evaluate real ML systems.', courses: ['Python for Machine Learning', 'Data Preparation', 'Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'Machine Learning Projects'] },
      { id: 'ai-automation', tab: 'AI Automation', title: 'AI Automation', description: 'Design practical workflows, agents, and automations with AI tools.', courses: ['AI Automation Fundamentals', 'AI Workflows', 'AI Agents', 'Automation Projects'] },
    ],
  },
  {
    id: 'app-development', title: 'App Development', description: 'Build mobile applications and cross-platform experiences.', icon: 'APP', color: '#f39d3c', roadmap: ['Programming Fundamentals', 'Mobile Fundamentals', 'Flutter / Android / React Native', 'APIs', 'Databases', 'Mobile App Project'],
    tracks: [
      { id: 'android', tab: 'Android', title: 'Android Development', description: 'Create Android experiences with modern platform tools.', courses: ['Java for Android', 'Kotlin Fundamentals', 'Android Development', 'Android Projects'] },
      { id: 'cross-platform', tab: 'Cross-Platform', title: 'Cross-Platform Development', description: 'Build applications that work across platforms from one codebase.', courses: ['Flutter Fundamentals', 'Dart Fundamentals', 'Flutter UI Development', 'Flutter Projects'] },
      { id: 'react-native', tab: 'React Native', title: 'React Native', description: 'Use familiar React patterns to build native mobile interfaces.', courses: ['React Native Fundamentals', 'React Native UI', 'React Native Navigation', 'React Native Projects'] },
      { id: 'mobile-projects', tab: 'Mobile Projects', title: 'Mobile App Projects', description: 'Turn your ideas into complete, launch-ready applications.', courses: ['Mobile App Projects'] },
    ],
  },
  {
    id: 'data-analytics', title: 'Data & Analytics', description: 'Learn how to collect, analyze, visualize, and understand data.', icon: 'DS', color: '#3fbf74', roadmap: ['Python', 'SQL', 'Data Cleaning', 'Data Analysis', 'Visualization', 'Data Project'],
    tracks: [
      { id: 'data-analysis', tab: 'Data Analysis', title: 'Data Analysis', description: 'Turn raw data into useful findings and decisions.', courses: ['Python for Data Analysis', 'NumPy Fundamentals', 'Pandas Fundamentals', 'Data Cleaning', 'Excel for Data Analysis', 'Data Analysis Projects'] },
      { id: 'sql-databases', tab: 'SQL & Databases', title: 'SQL & Databases', description: 'Query, organize, and design reliable data systems.', courses: ['SQL Fundamentals', 'Advanced SQL', 'MySQL', 'PostgreSQL', 'Database Projects'] },
      { id: 'data-visualization', tab: 'Data Visualization', title: 'Data Visualization', description: 'Tell clear stories with charts, dashboards, and visuals.', courses: ['Data Visualization Fundamentals', 'Matplotlib', 'Power BI', 'Data Visualization Projects'] },
      { id: 'data-science', tab: 'Data Science', title: 'Data Science', description: 'Combine statistics, code, and models to solve data problems.', courses: ['Python for Data Science', 'Statistics Fundamentals', 'Machine Learning Fundamentals', 'Data Science Projects'] },
    ],
  },
  {
    id: 'programming-foundations', title: 'Programming Foundations', description: 'Build strong programming fundamentals before specializing.', icon: '01', color: '#5b7cff', roadmap: ['Programming Basics', 'Variables & Control Flow', 'Functions', 'Data Structures', 'Algorithms', 'Projects'],
    tracks: [
      { id: 'c-programming', tab: 'C', title: 'C Programming', description: 'Learn low-level programming concepts and problem solving.', courses: ['C Fundamentals', 'C Variables & Data Types', 'C Control Flow', 'C Functions', 'C Pointers', 'C Projects'] },
      { id: 'cpp', tab: 'C++', title: 'C++', description: 'Build a strong object-oriented foundation with C++.', courses: ['C++ Fundamentals', 'Object-Oriented C++', 'C++ STL', 'C++ Projects'] },
      { id: 'java', tab: 'Java', title: 'Java', description: 'Learn structured programming and object-oriented design.', courses: ['Java Fundamentals', 'Object-Oriented Java', 'Java Collections', 'Java Projects'] },
      { id: 'python', tab: 'Python', title: 'Python', description: 'Start programming with a clear, practical language.', courses: ['Python Fundamentals', 'Python Functions', 'Object-Oriented Python', 'Python Projects'] },
      { id: 'algorithms', tab: 'Algorithms & Data Structures', title: 'Algorithms & Data Structures', description: 'Strengthen logic, efficiency, and technical problem solving.', courses: ['Algorithms Fundamentals', 'Data Structures', 'Searching & Sorting', 'Algorithms Projects'] },
    ],
  },
  {
    id: 'game-development', title: 'Game Development', description: 'Learn how to create interactive games and build real game projects.', icon: 'GM', color: '#e56b45', roadmap: ['Game Design', 'Programming', 'Physics', 'Unity', 'C#', 'Game Projects'],
    tracks: [
      { id: 'game-development', tab: 'Game Development', title: 'Game Development Fundamentals', description: 'Learn the core concepts behind interactive game experiences.', courses: ['Game Development Fundamentals', 'Game Programming', 'Game Mechanics'] },
      { id: 'unity', tab: 'Unity', title: 'Unity Development', description: 'Build playable worlds with Unity tools and workflows.', courses: ['Unity Fundamentals', 'Unity Game Development', 'Unity Projects'] },
      { id: 'c-sharp', tab: 'C#', title: 'C# for Game Development', description: 'Use C# to create game systems and interactive mechanics.', courses: ['C# Fundamentals', 'Object-Oriented C#', 'C# for Game Development'] },
      { id: 'game-projects', tab: 'Game Projects', title: 'Game Projects', description: 'Apply your game development skills by building complete projects.', courses: ['2D Game Project', '3D Game Project', 'Final Game Project'] },
    ],
  },
]

const getLearningStats = () => {
  const completed = learningCourses.filter((course) => course.progress >= 100).length
  const active = learningCourses.filter((course) => course.progress > 0 && course.progress < 100).length
  const totalLessons = learningCourses.reduce((sum, course) => sum + course.lessons, 0)

  return {
    completed,
    active,
    totalLessons,
  }
}

const protectedRoutes = new Set([
  '/dashboard',
  '/learn',
  '/code-editor',
  '/challenges',
  '/quizzes',
  '/certificates',
  '/settings',
  '/profile',
  '/account',
  '/courses',
  '/progress',
  '/admin',
])

const landingPlaceholderRoutes = {
  '/discuss': 'Discuss',
  '/pricing': 'Pricing',
  '/teams': 'Teams',
}

const navigate = (path) => {
  if (path === '/challenges') {
    window.location.assign('/challenges')
    return
  }
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const getActiveRoute = (route) => {
  switch (route) {
    case '/dashboard':
      return 'dashboard'
    case '/learn':
      return 'learn'
    case '/code-editor':
      return 'code-editor'
    case '/challenges':
      return 'challenges'
    case '/quizzes':
      return 'quizzes'
    case '/certificates':
      return 'certificates'
    case '/settings':
      return 'settings'
    case '/profile':
      return 'profile'
    case '/account':
      return 'account'
    case '/admin':
      return 'admin'
    default:
      return 'home'
  }
}

function Logo({ light = false, iconOnly = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''} ${iconOnly ? 'brand-icon-only' : ''}`}><img src={iconOnly ? '/codecraft-icon.png' : '/codecraft-logo.png'} alt={iconOnly ? 'CodeCraft' : 'CodeCraft - Learn, Build, Grow'} /></div>
}

function Button({ children, variant = 'primary', onClick }) {
  return <button className={`button button-${variant}`} onClick={onClick}>{children}</button>
}

function formatDisplayName(user) {
  if (!user) return ''
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || getEmailUsername(user.primaryEmailAddress?.emailAddress)
}

function getInitials(name) {
  if (!name) return 'CL'
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function getEmailUsername(email) {
  if (!email) return 'learner'
  return email.split('@')[0] || 'learner'
}

function LandingHeader() {
  const { isLoaded, isSignedIn, user } = useUser()
  const displayName = formatDisplayName(user)
  const navigation = [
    { label: 'Courses', route: '/courses' },
    { label: 'Code Editor', route: '/code-editor' },
    { label: 'Discuss', route: '/discuss' },
    { label: 'Pricing', route: '/pricing' },
    { label: 'Teams', route: '/teams' },
  ]

  const goTo = (route) => navigate(route)
  const mobileNavigationItems = [
    ...navigation.map(({ label, route }) => ({
      id: route,
      label,
      onSelect: () => goTo(route),
    })),
    ...(!isLoaded || !isSignedIn ? [
      { id: 'login', label: 'Log in', className: 'landing-login', onSelect: () => goTo('/auth?mode=login') },
      { id: 'register', label: 'Register', className: 'landing-register', onSelect: () => goTo('/auth?mode=signup') },
    ] : []),
  ]

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <button className="landing-brand" type="button" onClick={() => goTo('/')} aria-label="CodeCraft home">
          <img src="/codecraft-icon.png" alt="" />
          <span><strong>CodeCraft</strong><small>Learn • Build • Grow</small></span>
        </button>

        <nav className="landing-nav" aria-label="Primary navigation">
          {navigation.map(({ label, route }) => <button type="button" key={label} onClick={() => goTo(route)}>{label}</button>)}
          {!isLoaded || !isSignedIn ? (
            <div className="landing-mobile-auth">
              <button type="button" className="landing-login" onClick={() => goTo('/auth?mode=login')}>Log in</button>
              <button type="button" className="landing-register" onClick={() => goTo('/auth?mode=signup')}>Register</button>
            </div>
          ) : null}
        </nav>

        <div className="landing-auth">
          {!isLoaded || !isSignedIn ? (
            <>
              <button type="button" className="landing-login" onClick={() => goTo('/auth?mode=login')}>Log in</button>
              <button type="button" className="landing-register" onClick={() => goTo('/auth?mode=signup')}>Register</button>
            </>
          ) : (
            <>
              <button type="button" className="landing-dashboard" onClick={() => goTo('/dashboard')}>Dashboard</button>
              <div className="landing-user">
                <AdminHeaderAction />
                <NotificationBell />
                <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '32px', height: '32px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} />
                <span>{displayName}</span>
              </div>
            </>
          )}
        </div>

      </div>
      <MobileNavigation items={mobileNavigationItems} label="Primary navigation" presentation="landing" />
    </header>
  )
}

function Landing() {
  return <main className="landing-page">
    <LandingHeader />
    <section className="landing-hero"><div className="page-shell hero-grid"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> Learn to Code, Build Your Future</span><h1>Master Real-World Skills <span>with CodeCraft</span></h1><p>Learn programming, build real projects, and grow your career with hands-on coding courses, expert guidance and a supportive community.</p><div className="hero-actions"><Button onClick={() => navigate('/auth?mode=signup')}>Get Started Free <span>→</span></Button><Button variant="ghost" onClick={() => navigate('/auth?mode=login')}>Login <span>→</span></Button></div><div className="landing-stats"><div><strong>100<span>+</span></strong><small>Courses</small></div><div><strong>50K<span>+</span></strong><small>Active Learners</small></div><div><strong>4.8<span>/5</span></strong><small>Student Rating</small></div></div></div><HeroArt /></div></section>
    <section className="why-section"><div className="page-shell"><div className="section-heading"><span className="section-kicker">WHY CHOOSE CODECRAFT?</span><h2>Everything You Need <span>to Succeed</span></h2><p>We provide the tools, resources and support you need to learn, build and grow as a developer.</p></div><div className="feature-grid">{features.map(([icon, title, text]) => <article className="feature-card" key={title}><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{text}</p><span className="card-arrow">↗</span></article>)}</div><div className="trust-row"><span>TRUSTED BY LEARNERS WORLDWIDE</span><div><b>Students</b><b>Developers</b><b>Creators</b><b>Professionals</b><b>Future Leaders</b></div></div></div></section>
  </main>
}

function LandingPlaceholder({ title }) {
  return (
    <main className="landing-placeholder">
      <LandingHeader />
      <section>
        <span className="section-kicker">CODECRAFT</span>
        <h1>{title}</h1>
        <p>This CodeCraft space is coming soon.</p>
        <button type="button" className="button" onClick={() => navigate('/')}>Back to home</button>
      </section>
    </main>
  )
}

function HeroArt() {
  return <div className="hero-art" aria-label="Coding workspace illustration"><div className="code-orbit orbit-one">&lt;/&gt;</div><div className="code-orbit orbit-two">JS</div><div className="code-orbit orbit-three">Py</div><div className="laptop"><div className="laptop-screen"><div className="screen-top"><i /><i /><i /><span>app.js</span></div><pre><em>const</em> <b>future</b> = <strong>{`{`}</strong>{'\n'}  skills: <mark>"real-world"</mark>,{'\n'}  passion: <mark>true</mark>{'\n'}<strong>{`}`}</strong></pre></div><div className="laptop-base" /></div><div className="book book-html">HTML <small>&amp; CSS</small></div><div className="book book-js">JavaScript</div><div className="book book-py">Python</div><div className="plant"><span className="leaf leaf-a" /><span className="leaf leaf-b" /><span className="stem" /><span className="pot" /></div></div>
}

function AuthPage({ initialModeOverride = null }) {
  const { isLoaded, isSignedIn } = useUser()
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return initialModeOverride ?? (params.get('mode') === 'signup' || params.has('sign_up_force_redirect_url') ? 'signup' : 'login')
  })

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard')
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextMode = params.get('mode') === 'signup' || params.has('sign_up_force_redirect_url') ? 'signup' : 'login'
    setMode(nextMode)
  }, [window.location.search])

  const isSignup = mode === 'signup'
  const switchMode = (nextMode) => {
    setMode(nextMode)
    window.history.replaceState({}, '', `/auth?mode=${nextMode}`)
  }

  return <main className="auth-page"><section className="auth-showcase"><button className="auth-back" onClick={() => navigate('/')}>← Back to home</button><div className="auth-showcase-content"><div className="auth-brand"><Logo light iconOnly /><div><strong>CodeCraft</strong><span>Learn • Build • Grow</span></div></div><span className="auth-kicker">THE FUTURE OF LEARNING TO CODE</span><h1>Build Skills.<br /><span>Build Projects.</span><br />Build Your Future.</h1><p>Learn real-world programming skills through structured courses, hands-on practice, and real projects.</p><div className="auth-code-card"><span>const</span> yourFuture <b>=</b> <em>{`{`}</em><small>skills: <i>'real-world'</i>,</small><small>growth: <i>true</i></small><em>{`}`}</em><div className="auth-code-dots"><i /><i /><i /></div></div></div><div className="auth-showcase-footer"><span>100+ courses</span><span>50K+ learners</span><span>Learn by building</span></div></section><section className="auth-panel"><div className="auth-card"><div className="auth-tabs"><button className={!isSignup ? 'selected' : ''} onClick={() => switchMode('login')}>Login</button><button className={isSignup ? 'selected' : ''} onClick={() => switchMode('signup')}>Sign Up</button></div>{isSignup ? (
            <div className="auth-form-wrapper"><SignUp path="/auth" routing="path" forceRedirectUrl="/dashboard" appearance={{ elements: { rootBox: 'clerk-auth-root', card: 'clerk-auth-card' } }} /></div>
          ) : (
            <div className="auth-form-wrapper"><SignIn path="/auth" routing="path" forceRedirectUrl="/dashboard" appearance={{ elements: { rootBox: 'clerk-auth-root', card: 'clerk-auth-card' } }} /></div>
          )}</div></section></main>
}

function SidebarNavIcon({ type }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  switch (type) {
    case 'home':
      return <svg {...commonProps} width="18" height="18"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9 20v-7h6v7" /></svg>
    case 'learn':
      return <svg {...commonProps} width="18" height="18"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v10A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'code':
      return <svg {...commonProps} width="18" height="18"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></svg>
    case 'dashboard':
      return <svg {...commonProps} width="18" height="18"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="4" rx="1.5" /><rect x="13" y="12" width="7" height="8" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /></svg>
    case 'challenge':
      return <svg {...commonProps} width="18" height="18"><path d="M7 4h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M9 20h6M12 14v6" /></svg>
    case 'quiz':
      return <svg {...commonProps} width="18" height="18"><path d="M8 8h8M8 12h8M8 16h5" /><path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" /></svg>
    case 'certificate':
      return <svg {...commonProps} width="18" height="18"><path d="M8 5.5h8a2 2 0 0 1 2 2V15l-4-2-4 2-4-2V7.5a2 2 0 0 1 2-2Z" /><path d="M8 5V3.5h8V5" /><path d="M12 9.5v5" /></svg>
    case 'profile':
      return <svg {...commonProps} width="18" height="18"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" /></svg>
    case 'settings':
      return <svg {...commonProps} width="18" height="18"><path d="M10.2 3.6a1 1 0 0 1 1.6 0l.6 1a8.5 8.5 0 0 1 1.7.9l1.1-.4a1 1 0 0 1 1.3.8l.3 1.1a1 1 0 0 1-.3 1l.9 1a1 1 0 0 1 0 1.6l-.9 1a1 1 0 0 1 .3 1l-.3 1.1a1 1 0 0 1-1.3.8l-1.1-.4a8.5 8.5 0 0 1-1.7.9l-.6 1a1 1 0 0 1-1.6 0l-.6-1a8.5 8.5 0 0 1-1.7-.9l-1.1.4a1 1 0 0 1-1.3-.8l-.3-1.1a1 1 0 0 1 .3-1l-.9-1a1 1 0 0 1 0-1.6l.9-1a1 1 0 0 1-.3-1l.3-1.1a1 1 0 0 1 1.3-.8l1.1.4a8.5 8.5 0 0 1 1.7-.9z" /><circle cx="12" cy="12" r="3" /></svg>
    case 'account':
      return <svg {...commonProps} width="18" height="18"><circle cx="12" cy="8" r="3.5" /><path d="M5 18.5c1.5-2.5 4-3.8 7-3.8s5.5 1.3 7 3.8" /></svg>
    default:
      return null
  }
}

function Sidebar({ active, setActive }) {
  const items = [
    { label: 'Home', route: '/', id: 'home', icon: 'home' },
    { label: 'Learn', route: '/learn', id: 'learn', icon: 'learn' },
    { label: 'Code Editor', route: '/code-editor', id: 'code-editor', icon: 'code' },
    { label: 'Community', route: '/dashboard', id: 'dashboard', icon: 'dashboard' },
    { label: 'Challenges', route: '/challenges', id: 'challenges', icon: 'challenge' },
    { label: 'Quizzes', route: '/quizzes', id: 'quizzes', icon: 'quiz' },
    { label: 'Certificates', route: '/certificates', id: 'certificates', icon: 'certificate' },
    { label: 'Profile', route: '/profile', id: 'profile', icon: 'profile' },
  ]

  const mobileItems = items.map(({ label, route, id, icon }) => ({
    id,
    label,
    icon: <span className="sidebar-icon"><SidebarNavIcon type={icon} /></span>,
    isActive: active === id,
    onSelect: () => {
      setActive(id)
      navigate(route)
    },
  }))

  return (
    <>
      <aside className="sidebar">
        <Logo light />
        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map(({ label, route, id, icon }) => (
            <button
              key={label}
              type="button"
              className={`sidebar-nav-item ${active === id ? 'active' : ''}`}
              onClick={() => {
                setActive(id)
                navigate(route)
              }}
            >
              <span className="sidebar-icon"><SidebarNavIcon type={icon} /></span>
              <span>{label}</span>
              {label === 'Community' && <i className="nav-pulse" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-promo">
          <span className="promo-spark">✦</span>
          <h3>Build Your Future</h3>
          <p>Master in-demand skills, build real projects and become a better developer.</p>
          <Button variant="small" onClick={() => { setActive('learn'); navigate('/learn') }}>Start Learning <span>→</span></Button>
        </div>
        <div className="sidebar-foot">© 2024 CodeCraft</div>
      </aside>
      <MobileNavigation items={mobileItems} />
    </>
  )
}

function useHomeDashboardData(userId) {
  const [state, setState] = useState({ loading: true, data: null })
  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null })
    fetchHomeDashboard(userId).then((data) => {
      if (!cancelled) setState({ loading: false, data })
    })
    return () => { cancelled = true }
  }, [userId])
  return state
}

function buildHomeActivityEvents(dashboardData) {
  const events = []
  const lessonTitleById = new Map((dashboardData?.lessons || []).map((lesson) => [lesson.id, lesson]))
  const courseTitleById = new Map((dashboardData?.courses || []).map((course) => [course.id, course.title]))
  const quizTitleById = new Map((dashboardData?.quizzes || []).map((quiz) => [quiz.id, quiz.title]))

  for (const row of dashboardData?.lessonProgress || []) {
    if (!row.completed_at) continue
    const lesson = lessonTitleById.get(row.lesson_id)
    const course = courseTitleById.get(row.course_id)
    events.push({ at: row.completed_at, icon: '✓', title: `Completed ${course ? `${course} — ` : ''}${lesson?.title || 'a lesson'}`, description: 'Lesson completed' })
  }
  for (const attempt of dashboardData?.quizAttempts || []) {
    if (attempt.status === 'in_progress' || !attempt.submitted_at) continue
    events.push({ at: attempt.submitted_at, icon: '★', title: `Finished ${quizTitleById.get(attempt.quiz_id) || 'a quiz'}`, description: `Scored ${Number(attempt.percentage) || 0}%` })
  }
  for (const completion of dashboardData?.challengeCompletions || []) {
    events.push({ at: completion.completed_at, icon: '⚡', title: `Completed ${completion.challenge_title || 'a challenge'}`, description: `+${Number(completion.xp_awarded) || 0} XP` })
  }
  return events
}

function HomePage({ active, setActive }) {
  const { user } = useUser()
  const firstName = user?.firstName || user?.fullName || 'Learner'
  const { loading: dashboardLoading, data: dashboardData } = useHomeDashboardData(user?.id)

  const dashboard = useMemo(() => {
    if (!dashboardData) return null
    const { byCourse } = buildCourseProgress(dashboardData.courses, dashboardData.lessons, dashboardData.lessonProgress)
    const overall = buildOverallProgress(byCourse)
    const continueLearning = selectContinueLearning(byCourse)
    const quizStats = buildQuizStats(dashboardData.quizAttempts)
    const activityDates = []
    for (const row of dashboardData.lessonProgress) if (row.completed_at) activityDates.push(row.completed_at)
    for (const attempt of dashboardData.quizAttempts) if (attempt.status !== 'in_progress' && attempt.submitted_at) activityDates.push(attempt.submitted_at)
    for (const completion of dashboardData.challengeCompletions) if (completion.completed_at) activityDates.push(completion.completed_at)
    return {
      overall,
      continueLearning,
      quizStats,
      streak: buildStreak(activityDates),
      recentActivity: buildRecentActivityFromEvents(buildHomeActivityEvents(dashboardData), 6),
      xp: Number(dashboardData.progressRow?.xp) || 0,
      certificates: dashboardData.certificates.length,
      challengeCompletions: dashboardData.challengeCompletions.length,
      hasErrors: Object.values(dashboardData.errors || {}).some(Boolean),
    }
  }, [dashboardData])

  const loadingStat = dashboardLoading || !dashboard
  const continueEntry = dashboard?.continueLearning || null
  const continueCourse = continueEntry?.course || null
  const continueLesson = continueEntry?.lesson || null
  const continueProgress = continueEntry ? continueEntry.entry.progressPct : 0
  const continueLessonNumber = continueLesson && continueEntry ? (continueLesson.position ?? 0) + 1 : 0
  const openCourseHref = (course, lesson) => `/learn?course=${course.id}${lesson ? `&lesson=${lesson.id}` : ''}`

  const quickActions = [
    { title: 'Explore Courses', description: 'Find something new to learn.', icon: '📚', route: '/learn' },
    { title: 'Code Editor', description: 'Practice what you have learned.', icon: '💻', route: '/code-editor' },
    { title: 'Challenges', description: 'Test your coding skills.', icon: '⚡', route: '/challenges' },
    { title: 'Certificates', description: 'View your achievements.', icon: '🏆', route: '/certificates' },
  ]

  const recommendedCourses = [
    ['HTML Basics', 'Beginner', 6, 'HTML', '#e56b45'],
    ['CSS Fundamentals', 'Beginner', 8, 'CSS', '#2388ff'],
    ['Node.js for Beginners', 'Beginner', 10, 'N', '#3dbb73'],
    ['Python Basics', 'Beginner', 10, 'Py', '#f0b83f'],
  ]

  return <main className="dashboard-shell"><Sidebar active={active} setActive={setActive} /><div className="dashboard-main"><header className="dashboard-header home-header"><CourseSearch className="dashboard-course-search" /><div className="profile-actions"><AdminHeaderAction /><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="dashboard-content home-page">
    <section className="home-welcome-card"><div className="welcome-copy"><span className="section-kicker">HELLO, {firstName.toUpperCase()} 👋</span><h1>Welcome back to CodeCraft!</h1><p>Keep going, your skills are growing!</p><p className="welcome-subtitle">Learn, build real projects, and become the developer you want to be.</p><CourseSearch className="hero-course-search" /></div><div className="welcome-aside"><div className="welcome-code-art"><span>&lt;/&gt;</span><span>JS</span><span>Py</span></div><p>Make your next learning step count.</p><button className="button" onClick={() => navigate('/learn')}>Explore Courses <span>→</span></button></div></section>

    <section className="home-motivation-banner" aria-label="Motivational message"><div className="home-motivation-track"><span>Start today, learn one step at a time, build real projects, turn your skills into opportunities, and keep growing into the developer you want to become. 🚀</span><span>Start today, learn one step at a time, build real projects, turn your skills into opportunities, and keep growing into the developer you want to become. 🚀</span></div></section>

    <section className="home-section home-progress-section">
      <div className="home-progress-grid">
        <article className="home-progress-card continue-learning-card">
          <div className="continue-learning-layout">
            <div className="continue-learning-intro">
              <span className="section-kicker">CONTINUE LEARNING</span>
              <h2>Continue Learning</h2>
              <p>Pick up where you left off and keep building your skills.</p>
              <button type="button" className="section-link" onClick={() => navigate('/learn')}>View All Courses <span>→</span></button>
            </div>
            <div className="continue-learning-course-area">
              {loadingStat ? (
                <div className="continue-course-list">
                  <div className="continue-course-item">
                    <div className="continue-course-icon" style={{ background: '#2388ff' }}><span className="stat-skeleton" /></div>
                    <div className="continue-course-main">
                      <div className="continue-course-meta"><span className="stat-skeleton" /></div>
                      <p><span className="stat-skeleton" /></p>
                      <div className="continue-progress-bar"><span style={{ width: '0%' }} /></div>
                    </div>
                  </div>
                </div>
              ) : continueEntry && continueCourse && continueEntry.mode !== 'all-complete' ? (
                <div className="continue-course-list">
                  <div className="continue-course-item">
                    <div className="continue-course-icon" style={{ background: '#2388ff' }}>{String(continueCourse.icon || continueCourse.title.slice(0, 2)).toUpperCase().slice(0, 3)}</div>
                    <div className="continue-course-main">
                      <div className="continue-course-meta">
                        <strong>{continueCourse.title}</strong>
                        <span>{continueProgress}%</span>
                      </div>
                      <p>{continueEntry.mode === 'recommend' ? `${continueEntry.entry.totalLessons} lessons to explore` : `Lesson ${continueLessonNumber} of ${continueEntry.entry.totalLessons}${continueLesson ? ` — ${continueLesson.title}` : ''}`}</p>
                      <p className="continue-description">{continueCourse.description}</p>
                      <div className="continue-progress-bar"><span style={{ width: `${continueProgress}%` }} /></div>
                      <button type="button" className="button continue-button" onClick={() => navigate(openCourseHref(continueCourse, continueLesson))}>{continueEntry.mode === 'recommend' ? 'Start Learning' : 'Continue Learning'} <span>→</span></button>
                    </div>
                  </div>
                </div>
              ) : continueEntry?.mode === 'all-complete' ? (
                <div className="empty-learning-state">
                  <h3>🎉 All courses completed!</h3>
                  <p>Incredible work. Explore new skills to keep growing.</p>
                  <button type="button" className="button" onClick={() => navigate('/learn')}>Explore More Learning <span>→</span></button>
                </div>
              ) : (
                <div className="empty-learning-state">
                  <h3>Start your CodeCraft journey</h3>
                  <p>Choose a course and begin building your skills.</p>
                  <button type="button" className="button" onClick={() => navigate('/learn')}>Explore Courses <span>→</span></button>
                </div>
              )}
            </div>
          </div>
        </article>

        <article className="home-progress-card progress-card">
          <div className="section-header compact-header"><div><span className="section-kicker">YOUR PROGRESS</span><h2>Your Progress</h2></div></div>
          <div className="progress-overview">
            <div className="progress-ring" style={{ background: `conic-gradient(#1677ff 0 ${loadingStat ? 0 : dashboard.overall.percentage}%, #e9f2ff ${loadingStat ? 0 : dashboard.overall.percentage}% 100%)` }}>
              <div className="progress-ring-inner"><strong>{loadingStat ? <span className="stat-skeleton" /> : `${dashboard.overall.percentage}%`}</strong><span>Overall Progress</span></div>
            </div>
            <div className="progress-stats">
              <div><span>Courses Enrolled</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.overall.coursesEnrolled}</strong></div>
              <div><span>Courses Completed</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.overall.coursesCompleted}</strong></div>
              <div><span>Lessons Completed</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.overall.lessonsCompleted}</strong></div>
              <div><span>Challenges Completed</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.challengeCompletions}</strong></div>
              <div><span>Quizzes Completed</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.quizStats.quizzesCompleted}</strong></div>
              <div><span>Total XP</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.xp}</strong></div>
              <div><span>Certificates</span><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.certificates}</strong></div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section className="home-dashboard-grid">
      <article className="home-section streak-dashboard-card">
        <div className="streak-heading"><div><span className="section-kicker">KEEP IT UP</span><h2>Learning Streak</h2></div><strong>{loadingStat ? <span className="stat-skeleton" /> : dashboard.streak.current} <small>day{dashboard?.streak.current === 1 ? '' : 's'}</small></strong></div>
        <p>{loadingStat ? 'Loading your streak…' : dashboard.streak.current === 0 ? '🔥 Start your learning streak today!' : `🔥 ${dashboard.streak.current} day streak — ${dashboard.streak.current === 1 ? 'keep it going!' : 'keep it up!'}`}</p>
        <p className="streak-longest">{loadingStat ? '' : `Longest streak: ${dashboard.streak.longest} day${dashboard.streak.longest === 1 ? '' : 's'}`}</p>
        <div className="streak-week">{(loadingStat ? Array.from({ length: 7 }, () => ({})) : dashboard.streak.week).map((day, index) => {
          const label = day.key ? new Date(...day.key.split('-').map(Number)).toLocaleDateString(undefined, { weekday: 'short' }) : '·'
          return <div className={day.active ? 'is-complete' : ''} key={day.key || index}><span>{day.active ? '✓' : ''}</span><small>{label}</small></div>
        })}</div>
      </article>
      <article className="home-section challenges-dashboard-card">
        <div className="section-header compact-header"><div><span className="section-kicker">UP NEXT</span><h2>Upcoming Challenges</h2></div><button type="button" className="section-link" onClick={() => navigate('/challenges')}>View All <span>→</span></button></div>
        <UpcomingChallenges />
      </article>
    </section>

    <section className="home-section recommended-dashboard-section">
      <div className="section-header"><div><span className="section-kicker">KEEP EXPLORING</span><h2>Recommended Courses</h2><p>Top picks to help you grow faster.</p></div><button type="button" className="section-link" onClick={() => navigate('/learn')}>View All Courses <span>→</span></button></div>
      <div className="recommended-course-grid">{recommendedCourses.map(([title, level, lessons, icon, color]) => <article className="recommended-course-card" key={title}><span className="recommended-course-icon" style={{ background: color }}>{icon}</span><div><h3>{title}</h3><p>{level} <span>•</span> {lessons} lessons</p><div className="mini-progress"><span /></div><button type="button" className="button button-small" onClick={() => navigate('/learn')}>Start Course</button></div></article>)}</div>
    </section>

    <section className="home-dashboard-grid activity-dashboard-grid">
      <article className="home-section activity-dashboard-card"><div className="section-header compact-header"><div><span className="section-kicker">YOUR JOURNEY</span><h2>Recent Activity</h2></div><button type="button" className="section-link" onClick={() => navigate('/progress')}>View All <span>→</span></button></div><div className="activity-list">{loadingStat ? Array.from({ length: 3 }, (_, index) => <div className="activity-item" key={`skeleton-${index}`}><span className="activity-icon">·</span><div><span className="stat-skeleton" /></div><time /></div>) : dashboard.recentActivity.length ? dashboard.recentActivity.map((event) => <div className="activity-item" key={`${event.at}-${event.title}`}><span className="activity-icon">{event.icon}</span><div><strong>{event.title}</strong><small>{event.description}</small></div><time>{formatActivityDate(event.at)}</time></div>) : <p className="activity-empty">Complete a lesson, quiz, or challenge and your latest activity will appear here.</p>}</div></article>
      <article className="home-section motivation-dashboard-card"><span className="section-kicker">A LITTLE REMINDER</span><h2>Small steps<br />every day lead<br />to big results.</h2><p>Keep showing up for your future self.</p><button type="button" className="button" onClick={() => navigate('/learn')}>Keep Going <span>→</span></button></article>
    </section>

    <section className="home-section quick-actions-section">
      <div className="section-header compact-header"><div><span className="section-kicker">QUICK ACTIONS</span><h2>Quick Actions</h2></div></div>
      <div className="quick-actions-grid">
        {quickActions.map(({ title, description, icon, route }) => (
          <button type="button" key={title} className="quick-action-card" onClick={() => navigate(route)}>
            <span className="quick-action-icon">{icon}</span>
            <div>
              <strong>{title}</strong>
              <small>{description}</small>
            </div>
          </button>
        ))}
      </div>
    </section>

  </div></div></main>
}

function LearningPathDetails({ path, selectedTrack, onTrackChange, searchQuery }) {
  const courseCount = path.tracks.reduce((total, track) => total + track.courses.length, 0)
  const resolveCourse = (title) => {
    const catalogCourse = courseCatalog.find((course) => course.title === title)
    const progressCourse = learningCourses.find((course) => course.title === title)
    const [defaultIcon, defaultColor, defaultDifficulty, defaultLessons] = pathCourseDefaults[title] || ['++', path.color, 'Beginner', 8]
    return {
      title,
      description: catalogCourse?.description || `Build practical ${title} skills through guided lessons and projects.`,
      icon: catalogCourse?.icon || defaultIcon,
      color: catalogCourse?.color || defaultColor,
      difficulty: catalogCourse?.difficulty || defaultDifficulty,
      lessons: catalogCourse?.lessons || defaultLessons,
      progress: progressCourse?.progress || 0,
    }
  }

  const selectedTrackData = path.tracks.find((track) => track.id === selectedTrack)
  const visibleCourses = selectedTrackData?.courses.map(resolveCourse).filter((course) => !searchQuery || `${course.title} ${course.description}`.toLowerCase().includes(searchQuery)) || []
  const overviewTrackCards = path.tracks.map((track) => ({
    ...track,
    courseCount: track.courses.length,
    progress: Math.round(track.courses.reduce((total, title) => total + resolveCourse(title).progress, 0) / track.courses.length),
  }))

  if (selectedTrack === 'Overview') {
    return <section className="selected-path-details"><div className="selected-path-header"><div><span className="section-kicker">SELECTED PATH</span><h2>{path.title}</h2><p>{path.description}</p></div><strong>{courseCount} Courses</strong></div><div className="overview-track-grid web-track-options">{path.tracks.map((track) => <article className="overview-track-card" key={track.id}><span className="section-kicker">{track.courses.length} COURSES</span><h3>{track.tab || track.title}</h3><strong>{track.description}</strong><button type="button" className="button button-small" onClick={() => onTrackChange(track.id)}>Explore {track.tab || track.title} <span>→</span></button></article>)}</div></section>
  }

  return <section className="selected-path-details"><div className="selected-path-header"><div><span className="section-kicker">SELECTED PATH</span><h2>{path.title}</h2><p>{path.description}</p></div><strong>{courseCount} Courses</strong></div><div className="learn-track-tabs"><button type="button" className={selectedTrack === 'Overview' ? 'is-active' : ''} onClick={() => onTrackChange('Overview')}>Overview</button>{path.tracks.map((track) => <button type="button" className={selectedTrack === track.id ? 'is-active' : ''} key={track.id} onClick={() => onTrackChange(track.id)}>{track.tab || track.title}</button>)}</div>{selectedTrack === 'Overview' ? <div className="path-overview-content"><div className="path-roadmap"><span className="section-kicker">RECOMMENDED JOURNEY</span><h3>Start Your {path.title} Journey</h3><div className="roadmap-steps">{path.roadmap.map((step, index) => <div className="roadmap-step" key={step}><span>{index + 1}</span><strong>{step}</strong>{index < path.roadmap.length - 1 && <i>↓</i>}</div>)}</div></div><div className="overview-track-grid">{overviewTrackCards.map((track) => <article className="overview-track-card" key={track.id}><span className="section-kicker">{track.courseCount} COURSES</span><h3>{track.title}</h3><strong>{track.description}</strong><p>{track.progress > 0 ? `${track.progress}% path progress` : 'A guided route for your next skills.'}</p><button type="button" className="button button-small" onClick={() => onTrackChange(track.id)}>{track.progress > 0 ? 'Continue' : 'Start Learning'} <span>→</span></button></article>)}</div></div> : <div className="path-course-grid">{visibleCourses.map((course) => <article className="path-course-card" key={course.title}><span className="path-course-icon" style={{ background: course.color }}>{course.icon}</span><div><h3>{course.title}</h3><p>{course.difficulty} <span>•</span> {course.lessons} lessons</p>{course.progress > 0 && <div className="path-course-progress"><span style={{ width: `${course.progress}%` }} /></div>}<button type="button" className="button button-small" onClick={() => navigate(`/learn?search=${encodeURIComponent(course.title)}`)}>{course.progress >= 100 ? 'Completed' : course.progress > 0 ? 'Continue' : 'Start Course'} <span>→</span></button></div></article>)}{visibleCourses.length === 0 && <div className="learn-empty-state"><strong>No matching courses found</strong><p>Try another search term.</p></div>}</div>}</section>
}

function LearningPathDetailsLayout({ path, selectedTrack, onTrackChange, searchQuery }) {
  const courseCount = path.tracks.reduce((total, track) => total + track.courses.length, 0)
  const resolveCourse = (title) => {
    const catalogCourse = courseCatalog.find((course) => course.title === title)
    const progressCourse = learningCourses.find((course) => course.title === title)
    const [defaultIcon, defaultColor, defaultDifficulty, defaultLessons] = pathCourseDefaults[title] || ['++', path.color, 'Beginner', 8]
    return {
      title,
      description: catalogCourse?.description || `Build practical ${title} skills through guided lessons and projects.`,
      icon: catalogCourse?.icon || defaultIcon,
      color: catalogCourse?.color || defaultColor,
      difficulty: catalogCourse?.difficulty || defaultDifficulty,
      lessons: catalogCourse?.lessons || defaultLessons,
      progress: progressCourse?.progress || 0,
    }
  }

  const selectedTrackData = path.tracks.find((track) => track.id === selectedTrack)
  const visibleCourses = selectedTrackData?.courses.map(resolveCourse).filter((course) => !searchQuery || `${course.title} ${course.description}`.toLowerCase().includes(searchQuery)) || []
  const displayedCourses = visibleCourses

  const handleTrackChange = (trackId) => {
    onTrackChange(trackId)
  }

  return <section className="selected-path-details"><div className="selected-path-header"><div><span className="section-kicker">SELECTED PATH</span><h2>{path.title}</h2><p>{path.description}</p></div><strong>{courseCount} Courses</strong></div><div className="learn-track-layout"><nav className="learn-track-navigation" aria-label={`${path.title} tracks`}><span className="section-kicker">LEARNING JOURNEY</span>{path.tracks.map((track, index) => <button type="button" className={`learn-track-option ${selectedTrack === track.id ? 'is-active' : ''}`} key={track.id} onClick={() => handleTrackChange(track.id)}><span className="learn-track-number">{index + 1}</span><span>{track.tab || track.title}</span><span className="learn-track-arrow">→</span></button>)}</nav><div className="learn-track-content">{selectedTrack === 'Overview' ? <div className="learn-track-intro"><span className="section-kicker">CHOOSE YOUR NEXT STEP</span><h3>Explore the {path.title} tracks.</h3><p>Select a track from the learning journey to see its courses and continue building your skills.</p></div> : <><span className="section-kicker">{selectedTrackData?.tab || selectedTrackData?.title}</span><h3>{selectedTrackData?.title}</h3><p className="learn-track-description">{selectedTrackData?.description}</p>{selectedTrack === 'frontend' && <strong className="frontend-course-count">{selectedTrackData.courses.length} Courses Available</strong>}<div className="path-course-grid">{displayedCourses.map((course) => <article className="path-course-card" key={course.title}><span className="path-course-icon" style={{ background: course.color }}>{course.icon}</span><div><h3>{course.title}</h3><p>{course.difficulty} <span>•</span> {course.lessons} lessons</p>{course.progress > 0 && <div className="path-course-progress"><span style={{ width: `${course.progress}%` }} /></div>}<button type="button" className="button button-small" onClick={() => navigate(`/learn?search=${encodeURIComponent(course.title)}`)}>{course.progress >= 100 ? 'Completed' : course.progress > 0 ? 'Continue' : 'Start Course'} <span>→</span></button></div></article>)}{displayedCourses.length === 0 && <div className="learn-empty-state"><strong>No matching courses found</strong><p>Try another search term.</p></div>}</div></>}</div></div></section>
}

function StaticLearnPage({ active, setActive }) {
  const [selectedPath, setSelectedPath] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState('Overview')
  const searchQuery = new URLSearchParams(window.location.search).get('search')?.trim().toLowerCase() || ''
  const popularCourses = courseCatalog.filter((course) => ['Python', 'Java', 'C / C++'].includes(course.title))
  const selectedPathData = learningPaths.find((path) => path.id === selectedPath)

  const selectPath = (pathId) => {
    setSelectedPath(pathId)
    setSelectedTrack('Overview')
    window.setTimeout(() => document.querySelector('.selected-path-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const selectTrack = (trackId) => {
    setSelectedTrack(trackId)
  }

  return <main className="dashboard-shell"><Sidebar active={active} setActive={setActive} /><div className="dashboard-main"><header className="dashboard-header"><CourseSearch className="dashboard-course-search" initialQuery={searchQuery} /><div className="profile-actions"><AdminHeaderAction /><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="dashboard-content learn-page">
    <section className="learn-hero"><div><span className="section-kicker">CODECRAFT LEARNING LIBRARY</span><h1>What do you want to build?</h1><p>Choose a learning path and start developing real-world skills.</p></div><div className="learn-hero-art"><span>&lt;/&gt;</span><span>JS</span><span>Py</span></div></section>
    <section className="learn-paths-section"><div className="section-header learn-section-heading"><div><span className="section-kicker">START HERE</span><h2>Learning Paths</h2><p>Choose a path and build the skills you need.</p></div></div><div className="learning-path-grid">{learningPaths.map((path) => { const count = path.tracks.reduce((total, track) => total + track.courses.length, 0); return <button type="button" className={`learning-path-card ${selectedPath === path.id ? 'is-selected' : ''}`} key={path.id} onClick={() => selectPath(path.id)}><span className="learning-path-icon" style={{ background: path.color }}>{path.icon}</span><div><h3>{path.title}</h3><p>{path.description}</p><strong>{count} courses</strong></div><span className="learning-path-action">{selectedPath === path.id ? 'Selected' : 'Explore Path'} <span>→</span></span></button> })}</div></section>
    {selectedPathData && <LearningPathDetailsLayout path={selectedPathData} selectedTrack={selectedTrack} onTrackChange={selectTrack} searchQuery={searchQuery} />}
    <section className="learn-section popular-learn-section"><div className="section-header"><div><span className="section-kicker">TRENDING NOW</span><h2>Popular Courses</h2><p>Most in-demand courses right now.</p></div></div><div className="popular-learn-grid">{popularCourses.map((course) => <article className="popular-learn-card" key={course.title}><span className="path-course-icon" style={{ background: course.color }}>{course.icon}</span><div><h3>{course.title}</h3><p>{course.difficulty} <span>•</span> {course.lessons} lessons</p><button type="button" className="button button-small" onClick={() => navigate(`/learn?search=${encodeURIComponent(course.title)}`)}>Start Course <span>→</span></button></div></article>)}</div></section>
    <section className="learn-section learning-journey-card"><span className="section-kicker">KEEP BUILDING</span><h2>Start Your Learning Journey</h2><p>Choose a path, take the next lesson, and keep turning your ideas into skills.</p><button type="button" className="button" onClick={() => selectPath('web-development')}>Explore Web Development <span>→</span></button></section>
  </div></div></main>
}

function LearnPage({ active, setActive }) {
  return <><StaticLearnPage active={active} setActive={setActive} /><section className="learn-managed-content"><AnnouncementStrip /><ManagedCourseList /></section></>
}

function CommunityProjectPreview({ project }) {
  const files = project?.files || []
  const htmlFile = files.find((file) => /\.(html?|htm)$/i.test(file.name))
  const cssContent = files.filter((file) => /\.css$/i.test(file.name)).map((file) => file.content).join('\n')
  const jsContent = files.filter((file) => /\.(js|jsx|ts|tsx)$/i.test(file.name)).map((file) => file.content).join('\n')
  const legacyHtml = !htmlFile && /html/i.test(project?.language || '') ? project?.code : ''
  const htmlContent = htmlFile?.content || legacyHtml
  const scriptContent = jsContent.trim()
    ? `<script>const userScript = ${JSON.stringify(jsContent).replace(/</g, '\\u003c')}; if (userScript.trim()) new Function(userScript)()</script>`
    : ''
  const previewDocument = htmlContent
    ? `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${cssContent}</style></head><body>${htmlContent}${scriptContent}</body></html>`
    : ''
  const codeFile = files.find((file) => file.content) || (project?.code ? { name: 'Project code', content: project.code } : null)

  return (
    <section className="community-project-preview" aria-label={`Attached project: ${project?.title || 'Untitled project'}`}>
      <div className="community-project-preview-heading"><span>Selected CodeCraft project</span><span>{project?.language || 'HTML'}</span></div>
      <div className="community-project-preview-stage">
        {previewDocument ? (
          <iframe title={`${project?.title || 'Project'} preview`} srcDoc={previewDocument} sandbox="allow-scripts" />
        ) : project?.preview_image_url ? (
          <img src={project.preview_image_url} alt={`${project?.title || 'Project'} preview`} />
        ) : codeFile ? (
          <pre><span>{codeFile.name}</span>{'\n'}{codeFile.content.slice(0, 1200)}</pre>
        ) : (
          <p>{project?.description || 'This project does not have a preview or saved files yet.'}</p>
        )}
      </div>
      <div className="community-project-preview-details">
        <strong>{project?.title || 'Untitled project'}</strong>
        {project?.description && <span>{project.description}</span>}
      </div>
    </section>
  )
}

const formatRelativeCommunityTime = (value) => {
  const timestamp = new Date(value || 0).getTime()
  if (!timestamp) return 'Recently'
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const COMMENT_MAX_LENGTH = 1000

const formatCommentTime = (value) => {
  const timestamp = new Date(value || 0).getTime()
  if (!timestamp) return ''
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function PostCommentsSection({ postId, onCountChange }) {
  const { user } = useUser()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    fetchPostComments(postId).then((data) => {
      if (!isMounted) return
      setComments(data)
      setLoading(false)
      onCountChange?.(data.length)
    })
    return () => { isMounted = false }
  }, [postId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const content = draft.trim().slice(0, COMMENT_MAX_LENGTH)
    if (!content || posting || !user?.id) return
    setPosting(true)
    setError('')
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({ post_id: postId, clerk_user_id: user.id, content })
        .select('id, post_id, clerk_user_id, content, created_at')
        .single()
      if (insertError) throw insertError
      const name = user.username || user.fullName || 'CodeCraft Member'
      setComments((current) => [...current, {
        id: data.id,
        postId: data.post_id,
        clerkUserId: data.clerk_user_id,
        content: data.content,
        createdAt: data.created_at,
        user: name,
        initials: getInitials(name),
        avatar: user.imageUrl || '',
      }])
      setDraft('')
      onCountChange?.(comments.length + 1)
    } catch (submitError) {
      console.error('Comment post failed:', submitError)
      setError('Unable to post comment. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="post-comments">
      {error && <p className="post-comments-error" role="alert">{error}</p>}
      {loading ? <p className="post-comments-loading" role="status">Loading comments…</p> : (
        <ul className="post-comments-list">
          {comments.map((comment) => (
            <li key={comment.id} className="post-comment">
              <span className="post-avatar post-comment-avatar">{comment.avatar ? <img src={comment.avatar} alt={comment.user} /> : comment.initials}</span>
              <div className="post-comment-body">
                <div className="post-comment-head"><strong>{comment.user}</strong><time>{formatCommentTime(comment.createdAt)}</time></div>
                <p>{comment.content}</p>
              </div>
            </li>
          ))}
          {!comments.length && <li className="post-comments-empty">No comments yet — be the first to reply.</li>}
        </ul>
      )}
      <form className="post-comment-form" onSubmit={handleSubmit}>
        <input
          value={draft}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={user ? 'Write a comment...' : 'Sign in to comment'}
          aria-label="Write a comment"
          disabled={!user || posting}
        />
        <button type="submit" className="button button-small" disabled={!user || posting || !draft.trim()}>{posting ? 'Posting...' : 'Post Comment'}</button>
      </form>
    </div>
  )
}

// Merges repost records into the feed as quote-post entries that reference —
// never duplicate — the original post (embedded preview + shared action state).
const buildFeedWithReposts = (posts, reposts) => {
  const postsById = new Map((posts || []).map((post) => [String(post.id), post]))
  const entries = (reposts || [])
    .filter((repost) => postsById.has(String(repost.postId)))
    .map((repost) => {
      const original = postsById.get(String(repost.postId))
      return {
        ...original,
        id: `repost-${repost.id}`,
        isRepostEntry: true,
        repostId: repost.id,
        originalPostId: original.id,
        originalPost: {
          id: original.id,
          clerkUserId: original.clerkUserId,
          user: original.user,
          avatar: original.avatar,
          color: original.color,
          initials: original.initials,
          level: original.level,
          category: original.category,
          title: original.title,
          description: original.description,
          time: original.time,
          likes: original.likes,
          comments: original.comments,
          reposts: original.reposts || 0,
          likedByMe: original.likedByMe,
          repostedByMe: original.repostedByMe,
          attachments: original.attachments || [],
        },
        clerkUserId: repost.clerkUserId,
        user: repost.user,
        avatar: repost.avatar,
        initials: repost.initials,
        createdAt: repost.createdAt,
        time: formatRelativeCommunityTime(repost.createdAt),
        description: repost.thought || '',
        title: 'Reposted',
        level: 'Student',
        tags: [],
        projectId: null,
        attachments: [],
        likes: 0,
        comments: 0,
        reposts: 0,
        likedByMe: false,
        repostedByMe: false,
      }
    })
  return [...entries, ...(posts || [])]
}

function CommunityPostCard({ post, liked, repostedByMe, onToggleLike, onToggleRepost, currentUserId, onEditPost, onDeletePost, onReportPost, onCommentCountChange }) {
  const isRepostEntry = Boolean(post.isRepostEntry)
  const target = isRepostEntry ? post.originalPost : post
  const isOwner = !isRepostEntry && Boolean(currentUserId) && String(post.clerkUserId || '') === String(currentUserId)
  // Server truth first (persisted like), client flag as same-session fallback.
  const isLiked = Boolean(liked || target.likedByMe)
  const isReposted = Boolean(repostedByMe || target.repostedByMe)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const handleToggleComments = () => setCommentsOpen((open) => !open)

  return (
    <article className={`community-post ${isRepostEntry ? 'is-repost-entry' : ''}`} key={post.id}>
      {isRepostEntry && <div className="repost-entry-label"><span aria-hidden="true">↻</span> <strong>{post.user}</strong> reposted</div>}
      <div className="post-author">
        <span className="post-avatar" style={{ background: post.color }}>{post.avatar ? <img src={post.avatar} alt={post.user} /> : post.initials}</span>
        <div><strong>{post.user}</strong><span><b>{post.level}</b> <i>•</i> {post.time}</span></div>
        <span className="post-category">{post.category}</span>
      </div>
      {isRepostEntry && post.description ? <p className="repost-thought">{post.description}</p> : null}
      {isRepostEntry ? (
        <div className="repost-original-card">
          <div className="post-author">
            <span className="post-avatar" style={{ background: target.color }}>{target.avatar ? <img src={target.avatar} alt={target.user} /> : target.initials}</span>
            <div><strong>{target.user}</strong><span><b>{target.level}</b> <i>•</i> {target.time}</span></div>
            <span className="post-category">{target.category}</span>
          </div>
          <h2>{target.title}</h2>
          <p className="post-description">{target.description}</p>
          {target.attachments?.length > 0 && (
            <div className="post-attachments">
              {target.attachments.map((attachment) => attachment.kind === 'Image' || attachment.url?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i)
                ? <div className="post-attachment image-attachment" key={attachment.id}><img src={attachment.url} alt={attachment.name || 'Uploaded image'} className="community-attachment-image" /></div>
                : <div className="post-attachment" key={attachment.id}><span>{attachment.kind}</span><strong>{attachment.name}</strong></div>)}
            </div>
          )}
        </div>
      ) : (
        <>
          <h2>{post.title}</h2>
          <p className="post-description">{post.description}</p>
      {post.projectId ? (
        <CommunityProjectPreview project={post.project} />
      ) : post.preview === 'portfolio' ? (
        <div className="project-preview">
          <div className="preview-browser"><span /><span /><span /></div>
          <div className="preview-layout"><i /><div><b>Alex<span>folio</span></b><em>Design. Build. Launch.</em><small>Explore my work <strong>→</strong></small></div></div>
        </div>
      ) : null}
      {post.preview === 'code' && <pre className="post-code"><span>.container</span> {'{'}{`\n`}  display: <b>flex</b>;{`\n`}  align-items: <strong>center</strong>;{`\n`}  justify-content: <strong>center</strong>;{`\n`}{'}'}</pre>}
      {post.preview === 'challenge' && <div className="challenge-preview"><span className="challenge-check">✓</span><div><strong>JavaScript Basics</strong><small>12 challenges completed</small><div><i style={{ width: '100%' }} /></div></div><b>100%</b></div>}
      {post.attachments?.length > 0 && (
        <div className="post-attachments">
          {post.attachments.map((attachment) => attachment.kind === 'Image' || attachment.url?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i)
            ? <div className="post-attachment image-attachment" key={attachment.id}><img src={attachment.url} alt={attachment.name || 'Uploaded image'} className="community-attachment-image" /></div>
            : <div className="post-attachment" key={attachment.id}><span>{attachment.kind}</span><strong>{attachment.name}</strong></div>)}
        </div>
      )}
      <div className="post-tags">{(target.tags || []).map((tag) => <span key={`${target.id}-${tag}`}>{tag}</span>)}</div>
        </>
      )}
      <div className="post-actions">
        <button type="button" className={isLiked ? 'is-liked' : ''} aria-pressed={isLiked} onClick={() => onToggleLike(target.id)}><span>{isLiked ? '♥' : '♡'}</span> {isLiked ? 'Liked' : 'Like'} <b>{target.likes}</b></button>
        <button type="button" className={commentsOpen ? 'is-liked' : ''} aria-expanded={commentsOpen} onClick={handleToggleComments}><span>◌</span> Comment <b>{target.comments}</b></button>
        <button type="button" className={isReposted ? 'is-liked' : ''} aria-pressed={isReposted} onClick={() => onToggleRepost?.(target)}><span>↻</span> {isReposted ? 'Reposted' : 'Repost'} <b>{target.reposts || 0}</b></button>
        {isOwner && !isRepostEntry && (
          <>
            <button type="button" className="post-primary" onClick={() => onEditPost?.(post)}><span>✎</span> Edit Post</button>
            <button type="button" className="post-danger" onClick={() => onDeletePost?.(post)}><span>⌫</span> Delete Post</button>
          </>
        )}
        {!isOwner && !isRepostEntry && (
          <button type="button" className="post-primary" onClick={() => onReportPost?.(post)}>Report post</button>
        )}
      </div>
      {commentsOpen && <PostCommentsSection postId={target.id} onCountChange={(count) => onCommentCountChange?.(target.id, count)} />}
    </article>
  )
}

function RepostModal({ post, preview, posting, thought, onThoughtChange, onClose, onConfirm }) {
  if (!post) return null
  return (
    <div className="repost-modal-overlay" role="presentation" onClick={onClose}>
      <div className="repost-modal" role="dialog" aria-modal="true" aria-label="Repost this post" onClick={(event) => event.stopPropagation()}>
        <div className="repost-modal-head"><strong>Repost</strong><button type="button" aria-label="Close repost dialog" onClick={onClose}>✕</button></div>
        <label className="repost-thought-label" htmlFor="repost-thought-input">What do you think?</label>
        <textarea
          id="repost-thought-input"
          value={thought}
          rows={3}
          maxLength={500}
          placeholder="Share your thought about this post..."
          onChange={(event) => onThoughtChange(event.target.value)}
        />
        <div className="repost-original-preview">
          <span className="post-category">{preview?.category || post.category}</span>
          <strong>{preview?.user || post.user}</strong>
          <p>{preview?.content || post.description}</p>
        </div>
        <div className="repost-modal-actions">
          <button type="button" onClick={onClose} disabled={posting}>Cancel</button>
          <button type="button" className="button" onClick={onConfirm} disabled={posting}>{posting ? 'Reposting...' : 'Repost'}</button>
        </div>
      </div>
    </div>
  )
}

function CommunityPage({ active, setActive }) {
  const { user } = useUser()
  const currentUserId = getClerkUserId(user)
  const [filter, setFilter] = useState('All')
  const [likedPosts, setLikedPosts] = useState([])
  const [repostedPosts, setRepostedPosts] = useState([])
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [posts, setPosts] = useState([])
  const [repostTarget, setRepostTarget] = useState(null)
  const [repostThought, setRepostThought] = useState('')
  const [repostBusy, setRepostBusy] = useState(false)
  const [reposts, setReposts] = useState([])
  const socialActionBusyRef = useRef(false)

  const displayName = formatDisplayName(user)

  const sortPostsByNewestFirst = (items = []) => [...items].sort((firstPost, secondPost) => {
    const firstTimestamp = new Date(firstPost?.createdAt || firstPost?.created_at || 0).getTime()
    const secondTimestamp = new Date(secondPost?.createdAt || secondPost?.created_at || 0).getTime()
    return secondTimestamp - firstTimestamp
  })

  const visiblePosts = sortPostsByNewestFirst(buildFeedWithReposts(posts.filter(Boolean), reposts))

  const mergePostsById = (currentPosts, incomingPosts = []) => {
    const merged = [...currentPosts]

    incomingPosts.forEach((post) => {
      if (!post || !post.id) return

      const nextId = String(post.id)
      const existingIndex = merged.findIndex((currentPost) => String(currentPost.id) === nextId)

      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...post }
        return
      }

      merged.unshift(post)
    })

    return sortPostsByNewestFirst(merged)
  }

  useEffect(() => {
    if (!hasSupabaseConfig || !user) return undefined

    let isMounted = true
    const clerkUserId = getClerkUserId(user)

    const applyFeed = (data) => {
      setPosts((current) => mergePostsById(current, data))
      setLikedPosts((current) => {
        const likedIds = new Set(data.filter((post) => post.likedByMe).map((post) => post.id))
        return [...new Set([...current.filter((id) => !data.some((post) => post.id === id)), ...likedIds])]
      })
      setRepostedPosts((current) => {
        const repostedIds = new Set(data.filter((post) => post.repostedByMe).map((post) => post.id))
        return [...new Set([...current.filter((id) => !data.some((post) => post.id === id)), ...repostedIds])]
      })
    }

    // Posts + reposts load together; mergePostsById and the Set updates keep
    // realtime refreshes deduplicated (no double-rendered feed entries).
    const loadSocialData = async () => {
      const [feedPosts, recentReposts] = await Promise.all([
        fetchCommunityPosts({ likedBy: clerkUserId }),
        fetchRecentReposts(),
      ])
      if (!isMounted || !Array.isArray(feedPosts)) return
      applyFeed(feedPosts)
      if (Array.isArray(recentReposts)) setReposts(recentReposts)
    }

    void loadSocialData()

    const channel = supabase.channel('community-posts-sync')
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { void loadSocialData() })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [user, currentUserId])

  const toggleLike = async (postId) => {
    if (!user || !hasSupabaseConfig) {
      setLikedPosts((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId])
      return
    }

    const clerkUserId = getClerkUserId(user)
    if (!clerkUserId || socialActionBusyRef.current) return
    socialActionBusyRef.current = true

    try {
      const result = await togglePostLike(postId, clerkUserId)
      if (!result) {
        window.alert('Unable to update like. Please try again.')
        return
      }

      setPosts((current) => current.map((post) => {
        if (post.id !== postId) return post
        return { ...post, likes: Math.max(0, post.likes + (result.liked ? 1 : -1)) }
      }))

      setLikedPosts((current) => result.liked ? [...new Set([...current, postId])] : current.filter((id) => id !== postId))
    } catch (likeError) {
      console.error('Like update failed:', likeError)
      window.alert('Unable to update like. Please try again.')
    } finally {
      socialActionBusyRef.current = false
    }
  }

  const toggleRepost = async (post, thought = undefined) => {
    if (!user || !hasSupabaseConfig || !post?.id) return
    const clerkUserId = getClerkUserId(user)
    if (!clerkUserId || socialActionBusyRef.current) return
    socialActionBusyRef.current = true

    const isUndo = Boolean(repostedPosts.includes(post.id) || post.repostedByMe)
    if (!isUndo && thought === undefined) {
      socialActionBusyRef.current = false
      setRepostTarget(post)
      setRepostThought('')
      return
    }

    setRepostBusy(true)
    try {
      const result = await togglePostRepost({ postId: post.id, clerkUserId, thought })
      if (!result) {
        window.alert('Unable to repost. Please try again.')
        return
      }

      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, reposts: Math.max(0, (item.reposts || 0) + (result.reposted ? 1 : -1)) }
        : item))
      setRepostedPosts((current) => result.reposted ? [...new Set([...current, post.id])] : current.filter((id) => id !== post.id))
      setRepostTarget(null)
      setRepostThought('')
      const freshReposts = await fetchRecentReposts()
      if (Array.isArray(freshReposts)) setReposts(freshReposts)
    } catch (repostError) {
      console.error('Repost failed:', repostError)
      window.alert('Unable to repost. Please try again.')
    } finally {
      setRepostBusy(false)
      socialActionBusyRef.current = false
    }
  }

  const handleCommentCountChange = (postId, count) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: Math.max(0, count) } : post))
  }

  const refreshReposts = async () => {
    const fresh = await fetchRecentReposts()
    if (Array.isArray(fresh)) setReposts(fresh)
  }

  const handleEditPost = (post) => {
    setEditingPost(post)
  }

  const handleDeletePost = async (post) => {
    if (!post || !currentUserId) return
    const confirmed = window.confirm('Delete this post? This action cannot be undone.')
    if (!confirmed) return

    const wasDeleted = await deleteCommunityPost({ postId: post.id, clerkUserId: currentUserId })
    if (!wasDeleted) {
      window.alert('Unable to delete this post right now. Please try again.')
      return
    }

    setPosts((current) => current.filter((item) => String(item.id) !== String(post.id)))
    setEditingPost((current) => current && String(current.id) === String(post.id) ? null : current)
  }

  const handleReportPost = async (post) => {
    const reason = window.prompt('Why are you reporting this post?')?.trim()
    if (!reason || !user?.id) return

    const details = window.prompt('Additional details (optional):')?.trim() || ''
    const { error } = await supabase.from('reports').insert({
      reporter_clerk_user_id: user.id,
      target_type: 'post',
      post_id: post.id,
      target_clerk_user_id: post.clerkUserId || null,
      reason,
      details,
    })
    if (error) {
      window.alert(error.message || 'Unable to submit this report.')
      return
    }
    window.alert('Your report was sent to the CodeCraft moderation team.')
  }

  const handleSaveEditedPost = async (updatedPost) => {
    const targetPostId = updatedPost?.id || editingPost?.id
    if (!targetPostId || !currentUserId) return false

    const updated = await updateCommunityPost({
      postId: targetPostId,
      clerkUserId: currentUserId,
      content: updatedPost.description || '',
      projectId: updatedPost.projectId || null,
      postType: updatedPost.postType || 'discussion',
      attachments: (updatedPost.attachments || []).filter((attachment) => Boolean(attachment?.file)),
      keepImageUrls: updatedPost.keepImageUrls || [],
      removeImageUrls: updatedPost.removeImageUrls || [],
    })

    if (!updated) return false

    setPosts((current) => current.map((post) => {
      if (String(post.id) !== String(targetPostId)) return post

      const mergedTags = Array.isArray(updatedPost.tags) && updatedPost.tags.length ? updatedPost.tags : post.tags || []
      const nextAttachments = Array.isArray(updatedPost.attachments) ? updatedPost.attachments.filter((attachment) => attachment?.url || attachment?.file) : post.attachments || []

      return {
        ...post,
        id: targetPostId,
        description: updatedPost.description || post.description,
        title: updatedPost.title || post.title,
        category: updatedPost.category || post.category,
        type: updatedPost.type || post.type,
        preview: updatedPost.preview || post.preview,
        tags: mergedTags,
        projectId: updatedPost.projectId || null,
        project: updatedPost.project || null,
        attachments: nextAttachments,
        time: 'Just now',
        updatedAt: new Date().toISOString(),
        clerkUserId: currentUserId,
      }
    }))

    setEditingPost(null)
    return true
  }

  const handlePublishPost = async (newPost) => {
    const clerkUserId = getClerkUserId(user)

    if (hasSupabaseConfig && clerkUserId) {
      await ensureProfileFromClerk(user)

      const postType = newPost.postType || 'project'
      const created = await createCommunityPost({
        clerkUserId,
        postType,
        content: newPost.description || '',
        projectId: newPost.projectId || null,
        attachments: (newPost.attachments || []).map((attachment) => ({
          ...attachment,
          kind: attachment.kind || 'Project',
          file: attachment.file || null,
        })),
      })

      if (created) {
        const normalizedCreatedPost = {
          ...newPost,
          id: created.id || newPost.id,
          createdAt: created.created_at || new Date().toISOString(),
          projectId: created.project_id || newPost.projectId || null,
          project: newPost.project || null,
          initials: newPost.initials || 'CC',
          color: newPost.color || '#2388ff',
          avatar: user?.imageUrl || '',
          user: newPost.user || displayName || 'CodeCraft Member',
          level: newPost.level || 'Student',
          attachments: created.uploadedFiles || newPost.attachments || [],
          likes: 0,
          comments: 0,
          time: 'Just now',
          type: newPost.type || 'Projects',
          category: newPost.category || 'PROJECT',
          action: newPost.action || 'View Post',
          preview: newPost.preview || 'portfolio',
          tags: newPost.tags || ['#community'],
        }

        setPosts((current) => mergePostsById(current, [normalizedCreatedPost]))
        setFilter('All')
        return true
      }

      return false
    }

    const fallbackPost = {
      ...newPost,
      createdAt: new Date().toISOString(),
      initials: newPost.initials || 'CC',
      color: newPost.color || '#2388ff',
      avatar: user?.imageUrl || '',
      user: newPost.user || displayName || 'CodeCraft Member',
      level: newPost.level || 'Student',
      attachments: newPost.attachments || [],
    }

    setPosts((current) => mergePostsById(current, [fallbackPost]))
    setFilter('All')
    return true
  }

  return <main className="dashboard-shell community-shell"><Sidebar active={active} setActive={setActive} /><div className="dashboard-main"><header className="dashboard-header community-header"><label className="community-search"><span aria-hidden="true">⌕</span><input placeholder="Search posts, users, projects, or topics..." aria-label="Search posts, users, projects, or topics" /></label><div className="profile-actions"><AdminHeaderAction /><NotificationBell /><UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '33px', height: '33px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} /></div></header><div className="dashboard-content community-content">
    <section className="community-hero"><div className="community-hero-copy"><span className="section-kicker">CODECRAFT COMMUNITY</span><h1>CodeCraft Community</h1><p>Share your work, ask questions, get help, and connect with other developers. Together we build better!</p><div className="community-hero-stats"><span><strong>12.8K</strong> developers</span><span><strong>3.4K</strong> projects shared</span></div></div><div className="community-hero-art" aria-hidden="true"><div className="community-code-window"><div><i /><i /><i /><span>community.js</span></div><pre><em>const</em> community = <b>{`{`}</b>{'\n'}  learn: <strong>true</strong>,{'\n'}  build: <strong>true</strong>,{'\n'}  share: <strong>true</strong>{'\n'}<b>{`}`}</b></pre></div><span className="community-art-token token-html">&lt;/&gt;</span><span className="community-art-token token-js">JS</span><span className="community-art-token token-node">N</span></div></section>
    <div className="community-toolbar"><div className="community-tabs" role="tablist" aria-label="Community feed filters">{['All', 'Projects', 'Questions', 'Challenges'].map((tab) => <button type="button" role="tab" aria-selected={filter === tab} className={filter === tab ? 'is-active' : ''} key={tab} onClick={() => setFilter(tab)}>{tab}</button>)}</div><button type="button" className="button community-create" onClick={() => setIsCreatePostOpen(true)}>+ Create Post</button></div>
    <div className="community-layout">
      <section className="community-feed" aria-label="Community feed">
        {visiblePosts.map((post) => <CommunityPostCard key={post.id} post={post} liked={likedPosts.includes(post.id)} repostedByMe={repostedPosts.includes(post.id)} currentUserId={currentUserId} onToggleLike={toggleLike} onToggleRepost={toggleRepost} onCommentCountChange={(postId, count) => { handleCommentCountChange(postId, count); void refreshReposts() }} onEditPost={handleEditPost} onDeletePost={handleDeletePost} onReportPost={handleReportPost} />)}
      </section>
      <CommunityAside />
    </div>
  </div></div>
  <CreatePostModal
    open={isCreatePostOpen || Boolean(editingPost)}
    mode={editingPost ? 'edit' : 'create'}
    initialPost={editingPost}
    onClose={() => {
      setIsCreatePostOpen(false)
      setEditingPost(null)
    }}
    currentUser={user}
    displayName={displayName}
    onPublish={handlePublishPost}
    onSave={handleSaveEditedPost}
  />
  <RepostModal
    post={repostTarget}
    preview={repostTarget && !repostTarget.isRepostEntry ? repostTarget : null}
    posting={repostBusy}
    thought={repostThought}
    onThoughtChange={setRepostThought}
    onClose={() => { setRepostTarget(null); setRepostThought('') }}
    onConfirm={() => repostTarget && toggleRepost(repostTarget, repostThought)}
  />
  </main>
}

function ProfilePage() {
  const { user } = useUser()
  const clerkUserId = getClerkUserId(user)
  const [postState, setPostState] = useState({ clerkUserId: null, posts: [] })
  const [likedState, setLikedState] = useState({ clerkUserId: null, postIds: [] })
  const [repostedIds, setRepostedIds] = useState([])
  const profileRepostBusyRef = useRef(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const posts = postState.clerkUserId === clerkUserId ? postState.posts : []
  const likedPosts = likedState.clerkUserId === clerkUserId ? likedState.postIds : []
  const isLoading = Boolean(clerkUserId) && postState.clerkUserId !== clerkUserId
  const displayName = formatDisplayName(user) || 'CodeCraft Member'
  const username = user?.username ? `@${user.username}` : ''
  const email = user?.primaryEmailAddress?.emailAddress || ''

  useEffect(() => {
    if (!clerkUserId) return undefined

    let isMounted = true
    const loadPosts = async () => {
      const data = await fetchCommunityPosts({ clerkUserId, likedBy: clerkUserId })
      if (!isMounted) return
      setPostState({ clerkUserId, posts: data })
    }

    loadPosts()

    if (!hasSupabaseConfig) return () => { isMounted = false }

    const channel = supabase.channel(`profile-posts-${clerkUserId}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `clerk_user_id=eq.${clerkUserId}` }, loadPosts)
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [clerkUserId])

  const toggleLike = async (postId) => {
    if (!clerkUserId || !hasSupabaseConfig) return
    const result = await togglePostLike(postId, clerkUserId)
    if (!result) return

    setPostState((current) => current.clerkUserId !== clerkUserId ? current : {
      ...current,
      posts: current.posts.map((post) => post.id === postId
        ? { ...post, likes: Math.max(0, post.likes + (result.liked ? 1 : -1)) }
        : post),
    })
    setLikedState((current) => {
      const postIds = current.clerkUserId === clerkUserId ? current.postIds : []
      return {
        clerkUserId,
        postIds: result.liked ? [...new Set([...postIds, postId])] : postIds.filter((id) => id !== postId),
      }
    })
  }

  // Repost from the profile feed acts on the post directly (thought optional).
  const toggleRepost = async (post) => {
    if (!clerkUserId || !hasSupabaseConfig || !post?.id || profileRepostBusyRef.current) return
    profileRepostBusyRef.current = true
    try {
      const result = await togglePostRepost({ postId: post.id, clerkUserId, thought: '' })
      if (!result) {
        window.alert('Unable to repost. Please try again.')
        return
      }
      setPostState((current) => current.clerkUserId !== clerkUserId ? current : {
        ...current,
        posts: current.posts.map((item) => item.id === post.id
          ? { ...item, reposts: Math.max(0, (item.reposts || 0) + (result.reposted ? 1 : -1)) }
          : item),
      })
      setRepostedIds((current) => result.reposted ? [...new Set([...current, post.id])] : current.filter((id) => id !== post.id))
    } catch (repostError) {
      console.error('Repost failed:', repostError)
      window.alert('Unable to repost. Please try again.')
    } finally {
      profileRepostBusyRef.current = false
    }
  }

  const handleEditPost = async (post) => {
    if (!post) return
    const { id } = post
    const nextModalPost = {
      ...post,
      id,
      postType: post.postType || 'discussion',
      description: post.description || '',
      projectId: post.projectId || null,
      tags: Array.isArray(post.tags) ? post.tags : [],
      attachments: Array.isArray(post.attachments) ? post.attachments : [],
    }

    setEditingPost(nextModalPost)
    setIsEditModalOpen(true)
  }

  const handleDeletePost = async (post) => {
    if (!post || !clerkUserId) return
    const confirmed = window.confirm('Delete this post? This action cannot be undone.')
    if (!confirmed) return

    const wasDeleted = await deleteCommunityPost({ postId: post.id, clerkUserId })
    if (!wasDeleted) {
      window.alert('Unable to delete this post right now. Please try again.')
      return
    }

    setPostState((current) => current.clerkUserId !== clerkUserId ? current : {
      ...current,
      posts: current.posts.filter((item) => String(item.id) !== String(post.id)),
    })
    setEditingPost(null)
    setIsEditModalOpen(false)
  }

  const handleSaveEditedPost = async (updatedPost) => {
    if (!updatedPost?.id || !clerkUserId) return false

    const updated = await updateCommunityPost({
      postId: updatedPost.id,
      clerkUserId,
      content: updatedPost.description || '',
      projectId: updatedPost.projectId || null,
      postType: updatedPost.postType || 'discussion',
      attachments: (updatedPost.attachments || []).filter((attachment) => Boolean(attachment?.file)),
      keepImageUrls: updatedPost.keepImageUrls || [],
      removeImageUrls: updatedPost.removeImageUrls || [],
    })

    if (!updated) return false

    setPostState((current) => current.clerkUserId !== clerkUserId ? current : {
      ...current,
      posts: current.posts.map((post) => String(post.id) === String(updatedPost.id)
        ? {
            ...post,
            description: updatedPost.description || post.description,
            projectId: updatedPost.projectId || null,
            tags: Array.isArray(updatedPost.tags) && updatedPost.tags.length ? updatedPost.tags : post.tags || [],
            attachments: Array.isArray(updatedPost.attachments) ? updatedPost.attachments.filter((attachment) => attachment?.url || attachment?.file) : post.attachments || [],
            title: updatedPost.title || post.title,
            category: updatedPost.category || post.category,
            type: updatedPost.type || post.type,
            preview: updatedPost.preview || post.preview,
            postType: updatedPost.postType || post.postType || 'discussion',
          }
        : post),
    })

    setEditingPost(null)
    setIsEditModalOpen(false)
    return true
  }

  return (
    <main className="dashboard-shell community-shell profile-shell">
      <Sidebar active="profile" setActive={() => {}} />
      <div className="dashboard-main">
        <header className="dashboard-header community-header">
          <span className="profile-page-title">Profile</span>
          <CourseSearch className="global-header-search" />
          <div className="profile-actions"><AdminHeaderAction /><NotificationBell /><UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '33px', height: '33px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} /></div>
        </header>
        <div className="dashboard-content community-content profile-page-content">
          <section className="profile-identity" aria-label="Your Clerk profile">
            <div className="profile-identity-avatar">{user?.imageUrl ? <img src={user.imageUrl} alt={displayName} /> : <span>{getInitials(displayName)}</span>}</div>
            <div className="profile-identity-details">
              <h1>{displayName}</h1>
              {username && <p>{username}</p>}
              {!username && email && <p>{email}</p>}
              {username && email && <span>{email}</span>}
            </div>
          </section>
          <section className="profile-posts-section" aria-labelledby="profile-posts-heading">
            <div className="profile-posts-heading"><h2 id="profile-posts-heading">My Posts</h2>{!isLoading && <span>{posts.length}</span>}</div>
            {isLoading ? <div className="profile-posts-loading" role="status">Loading your posts...</div> : posts.length ? (
              <div className="community-feed profile-post-feed">
                {posts.map((post) => <CommunityPostCard key={post.id} post={post} liked={likedPosts.includes(post.id)} repostedByMe={repostedIds.includes(post.id)} currentUserId={clerkUserId} onToggleLike={toggleLike} onToggleRepost={toggleRepost} onEditPost={handleEditPost} onDeletePost={handleDeletePost} />)}
              </div>
            ) : (
              <div className="profile-empty-state">
                <h3>No posts yet</h3>
                <p>Share your first project with the CodeCraft community.</p>
                <button type="button" className="button button-small" onClick={() => navigate('/dashboard')}>Create a Post <span>→</span></button>
              </div>
            )}
          </section>
        </div>
      </div>
      <CreatePostModal
        open={isEditModalOpen}
        mode="edit"
        initialPost={editingPost}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingPost(null)
        }}
        currentUser={user}
        displayName={displayName}
        onPublish={() => false}
        onSave={handleSaveEditedPost}
      />
    </main>
  )
}

function CommunityAside() {
  const topics = [['Best practices for React state management', '2.4k', '186', '⚛'], ['How to deploy a full-stack app?', '1.8k', '142', '⬡'], ['CSS Flexbox tips for beginners', '1.2k', '98', '◈'], ['JavaScript interview questions', '986', '74', 'JS'], ['Build a REST API with Node.js', '764', '61', 'N']]
  const contributors = [['MayaBuilds', 'Full Stack Pro', 'MB', '2,840', '#3fbf74'], ['DevRohan', 'React Specialist', 'DR', '2,416', '#2388ff'], ['LenaCodes', 'Frontend Expert', 'LC', '2,190', '#f39d3c']]
  return <aside className="community-aside"><section className="community-side-section"><div className="side-heading"><h2>Trending in Community</h2><button type="button">View all</button></div><div className="trending-list">{topics.map(([topic, likes, comments, icon], index) => <div className="trending-item" key={topic}><b className="trend-rank">{String(index + 1).padStart(2, '0')}</b><span className="trend-icon">{icon}</span><div><strong>{topic}</strong><small>{likes} likes <i>•</i> {comments} comments</small></div></div>)}</div></section><section className="community-side-section"><div className="side-heading"><h2>Top Contributors</h2><button type="button">View all</button></div><div className="contributors-list">{contributors.map(([name, level, initials, points, color]) => <div className="contributor" key={name}><span className="contributor-avatar" style={{ background: color }}>{initials}</span><span><strong>{name}</strong><small>{level}</small></span><b>{points}<small>pts</small></b></div>)}</div></section><section className="conversation-card"><span className="conversation-icon">✦</span><h2>Start a Conversation</h2><p>Have a question, idea, or just want to say hi? Jump into the community and connect with fellow developers.</p><button type="button" className="button button-small">Create Post <span>→</span></button></section></aside>
}

function Dashboard({ active, setActive }) {
  const { user } = useUser()
  const displayName = formatDisplayName(user)
  const fallbackName = user?.firstName || user?.fullName || getEmailUsername(user?.primaryEmailAddress?.emailAddress || '')
  const userImage = user?.imageUrl || ''
  const initials = getInitials(displayName)

  return <main className="dashboard-shell"><Sidebar active={active} setActive={setActive} /><div className="dashboard-main"><header className="dashboard-header"><CourseSearch className="global-header-search" /><div className="profile-actions"><NotificationBell /><div className="profile-summary"><span className="avatar-wrap">{userImage ? <img className="avatar avatar-image" src={userImage} alt={displayName} /> : <span className="avatar">{initials}</span>}</span><span className="profile-name">{displayName}</span><span className="chevron">⌄</span></div><UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '33px', height: '33px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} /></div></header><div className="dashboard-content"><div className="dashboard-intro"><div><span className="section-kicker">TUESDAY, SEPTEMBER 12, 2024</span><h1>Welcome back, {fallbackName} <span>✦</span></h1><p>What do you want to learn today?</p><div className="intro-search">⌕<span>Search for courses...</span><b>⌘ K</b></div></div><div className="intro-illustration"><div className="intro-sun" /><div className="intro-window"><span /><span /><span /><code>&lt;code&gt;</code></div><div className="intro-person">◕</div></div></div><section className="dashboard-section"><div className="section-title"><div><span className="section-kicker">EXPLORE THE LIBRARY</span><h2>Your Courses</h2></div><button onClick={() => setActive('learn')}>View All Courses <span>→</span></button></div><div className="category-grid">{categories.map((category, index) => <button className={`category-card category-${index}`} key={category.id} onClick={() => setActive('learn')}><span className="category-icon">{category.icon}</span><span><strong>{category.name}</strong><small>{category.count} courses</small></span><span className="card-arrow">↗</span></button>)}</div></section><div className="dashboard-columns"><div><ContinueLearning /><Recommended /></div><Progress /></div></div></div></main>
}

function ContinueLearning() { return <section className="dashboard-section continue-section"><div className="section-title"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Continue Learning</h2></div><button>View All <span>→</span></button></div><article className="continue-card"><div className="course-thumb blue-thumb"><span>&lt;/&gt;</span><i>HTML</i><b>CSS</b></div><div className="continue-info"><div className="course-meta"><span>WEB DEVELOPMENT</span><b>45%</b></div><h3>Responsive Web Design</h3><p>Lesson 5 of 12 <span>•</span> Building layouts with Flexbox</p><div className="progress-bar"><span style={{ width: '45%' }} /></div><button className="continue-button">Continue Learning <span>→</span></button></div></article></section> }

function Progress() { return <aside className="progress-column"><section className="progress-card"><div className="section-title"><div><span className="section-kicker">YOUR JOURNEY</span><h2>Your Progress</h2></div><button>Details <span>→</span></button></div><div className="progress-ring"><div><strong>32<span>%</span></strong><small>Overall Progress</small></div></div><div className="metrics"><div><strong>6</strong><span>Courses Enrolled</span></div><div><strong>28</strong><span>Lessons Completed</span></div><div><strong>1</strong><span>Certificates Earned</span></div></div></section><section className="streak-card"><div className="streak-heading"><span className="flame">✦</span><div><span className="section-kicker">KEEP IT UP</span><h3>Learning Streak</h3></div><strong>3 <small>days</small></strong></div><p>Keep going! You're doing great.</p><div className="week">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div className={i < 3 ? 'done' : ''} key={`${day}-${i}`}><span>{i < 3 ? '✦' : '·'}</span><small>{day}</small></div>)}</div></section><section className="practice-card"><span className="practice-icon">⌘</span><div><h3>Practice Makes Perfect</h3><p>Use the code editor to practice what you've learned and build real projects.</p><button onClick={() => navigate('/code-editor')}>Open Code Editor <span>→</span></button></div></section></aside> }

function Recommended() { return <section className="dashboard-section recommended"><div className="section-title"><div><span className="section-kicker">KEEP EXPLORING</span><h2>Recommended for You</h2></div><button>View All <span>→</span></button></div><div className="recommendation-grid">{recommendations.map(([title, text, color, icon]) => <article className="recommendation-card" key={title}><div className={`recommendation-icon ${color}`}>{icon}</div><h3>{title}</h3><p>{text}</p><button>Explore <span>→</span></button></article>)}</div></section> }

function AccountPage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const stats = getLearningStats()
  const displayName = formatDisplayName(user)
  const email = user?.primaryEmailAddress?.emailAddress || 'user@example.com'
  const memberDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'
  const userId = user?.id || 'user_xxxxxxxxx'
  const avatar = user?.imageUrl || ''

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
    } catch (error) {
      setCopied(true)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' })
  }

  const accountActions = [
    { title: 'My Profile', description: 'View and edit your profile', icon: '◌', route: '/profile' },
    { title: 'My Courses', description: 'View your enrolled courses', icon: '▣', route: '/courses' },
    { title: 'Certificates', description: 'View your certificates', icon: '✓', route: '/certificates' },
    { title: 'Progress', description: 'Track your learning progress', icon: '◔', route: '/progress' },
    { title: 'Settings', description: 'Account and platform settings', icon: '⚙', route: '/settings' },
  ]

  if (!isLoaded) {
    return <div className="auth-loading">Loading your account...</div>
  }

    return (
      <main className="dashboard-shell account-shell">
        <Sidebar active="account" setActive={() => {}} />
        <div className="dashboard-main">
          <header className="dashboard-header">
            <CourseSearch className="global-header-search" />
            <div className="profile-actions">
              <NotificationBell />
              <AdminHeaderAction />
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '33px', height: '33px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} />
            </div>
          </header>

          <div className="account-page">
            <div className="account-card account-profile-header">
              <div className="account-profile-meta">
                <div className="account-avatar-wrap">{avatar ? <img className="account-avatar" src={avatar} alt={displayName} /> : <span className="account-avatar fallback-avatar">{getInitials(displayName)}</span>}</div>
                <div className="account-profile-text">
                  <span className="section-kicker">PROFILE</span>
                  <h1>{displayName}</h1>
                  <p>{email}</p>
                  <span className="account-role">Student</span>
                  <div className="account-meta-row"><span>Member since {memberDate}</span><span>Learning path • {stats.completed} courses finished</span></div>
                </div>
              </div>
              <div className="account-actions">
                <button type="button" className="text-button account-link" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
                <button type="button" className="button button-small" onClick={handleSignOut}>Sign out</button>
              </div>
            </div>

            <div className="account-grid">
              <div className="account-card account-panel">
                <div className="account-panel-header"><h3>Account overview</h3><span className="badge">Active</span></div>
                <div className="account-info-list">
                  <div className="account-info-row"><span>Account ID</span><strong>{userId}</strong><button type="button" className="copy-button" onClick={handleCopyId}>{copied ? 'Copied!' : 'Copy'}</button></div>
                  <div className="account-info-row"><span>Email</span><strong>{email}</strong></div>
                  <div className="account-info-row"><span>Member since</span><strong>{memberDate}</strong></div>
                  <div className="account-info-row"><span>Learning plan</span><strong>Full stack track</strong></div>
                </div>
              </div>

              <div className="account-card account-panel">
                <div className="account-panel-header"><h3>Quick actions</h3></div>
                <div className="account-action-list">
                  {accountActions.map((action) => (
                    <button type="button" className="action-card" key={action.title} onClick={() => navigate(action.route)}>
                      <span className="action-icon">{action.icon}</span>
                      <div><strong>{action.title}</strong><small>{action.description}</small></div>
                      <span className="action-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="account-card stats-card">
              <div className="account-panel-header"><h3>Learning stats</h3></div>
              <div className="stats-grid">
                <div className="stat-box"><span>Completed</span><strong>{stats.completed}</strong></div>
                <div className="stat-box"><span>Active</span><strong>{stats.active}</strong></div>
                <div className="stat-box"><span>Total lessons</span><strong>{stats.totalLessons}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
}

function LegacyAdminDashboard({ active, setActive }) {
  const { user } = useUser()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [query, setQuery] = useState('')
  const [overview, setOverview] = useState({ totalUsers: 0, totalPosts: 0, totalProjects: 0, publishedAnnouncements: 0, totalReports: 0, totalCertificates: 0 })
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [projects, setProjects] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [settings, setSettings] = useState({ maintenance_mode: false, community_enabled: true, feature_flags: '[]' })
  const [auditLogs, setAuditLogs] = useState([])

  const loadAdminData = async () => {
    if (!user?.id) return

    const allowed = await isUserAdmin(user.id)
    setAuthorized(allowed)
    if (!allowed) {
      setLoading(false)
      return
    }

    const [profilesResult, postsResult, projectsResult, announcementsResult, settingsResult, auditResult, adminRolesResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_settings').select('*').order('updated_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('admin_roles').select('clerk_user_id').order('created_at', { ascending: false }),
    ])

    const nextUsers = (profilesResult.data || []).map((profile) => ({
      ...profile,
      isAdmin: (adminRolesResult.data || []).some((entry) => entry.clerk_user_id === profile.clerk_user_id),
    }))

    const nextPosts = postsResult.data || []
    const nextProjects = projectsResult.data || []
    const nextAnnouncements = announcementsResult.data || []
    const nextSettings = (settingsResult.data || []).reduce((accumulator, entry) => ({
      ...accumulator,
      [entry.key]: entry.value,
    }), {})

    setUsers(nextUsers)
    setPosts(nextPosts)
    setProjects(nextProjects)
    setAnnouncements(nextAnnouncements)
    setSettings({
      maintenance_mode: Boolean(nextSettings.maintenance_mode),
      community_enabled: nextSettings.community_enabled !== false,
      feature_flags: typeof nextSettings.feature_flags === 'string' ? nextSettings.feature_flags : JSON.stringify(nextSettings.feature_flags || []),
    })
    setAuditLogs(auditResult.data || [])
    setOverview({
      totalUsers: nextUsers.length,
      totalPosts: nextPosts.length,
      totalProjects: nextProjects.length,
      publishedAnnouncements: nextAnnouncements.filter((entry) => entry.is_published).length,
      totalReports: 0,
      totalCertificates: 0,
    })
    setLoading(false)
  }

  useEffect(() => {
    if (!user?.id) {
      setAuthorized(false)
      setLoading(false)
      return undefined
    }

    loadAdminData()
    return undefined
  }, [user?.id])

  const recordAudit = async (action, targetType, targetId, details = {}) => {
    if (!user?.id) return

    await supabase.from('audit_logs').insert({
      actor_clerk_user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    })
  }

  const handleRoleToggle = async (targetClerkUserId, isAdminState) => {
    if (!user?.id) return

    try {
      await updateUserAdminRole({
        targetClerkUserId,
        enabled: !isAdminState,
        actorClerkUserId: user.id,
      })
      await recordAudit('admin_role_changed', 'profile', targetClerkUserId, {
        enabled: !isAdminState,
        actor: user.id,
      })
      await loadAdminData()
    } catch (error) {
      window.alert(error.message || 'Unable to update admin role.')
    }
  }

  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm('Delete this community post? This only removes the community post and leaves the underlying project intact.')
    if (!confirmed) return

    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      window.alert('Unable to delete this post right now.')
      return
    }

    await recordAudit('post_deleted', 'post', postId, { actor: user.id })
    await loadAdminData()
  }

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      window.alert('Title and body are required for announcements.')
      return
    }

    const { error } = await supabase.from('announcements').insert({
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
      is_published: true,
      created_by_clerk_user_id: user.id,
    })

    if (error) {
      window.alert('Unable to create announcement.')
      return
    }

    setAnnouncementTitle('')
    setAnnouncementBody('')
    await recordAudit('announcement_created', 'announcement', announcementTitle.trim(), { actor: user.id })
    await loadAdminData()
  }

  const handleSaveSetting = async (key, value) => {
    const payload = { key, value, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('admin_settings').upsert(payload, { onConflict: 'key' })

    if (error) {
      window.alert('Unable to save configuration.')
      return
    }

    await recordAudit('settings_updated', 'setting', key, { value })
    await loadAdminData()
  }

  const filteredUsers = users.filter((entry) => {
    if (!query.trim()) return true
    const haystack = `${entry.username || ''} ${entry.clerk_user_id || ''} ${entry.email || ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const filteredPosts = posts.filter((entry) => {
    if (!query.trim()) return true
    const haystack = `${entry.content || ''} ${entry.post_type || ''} ${entry.clerk_user_id || ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  if (!user?.id) {
    return <div className="auth-loading">Loading admin access…</div>
  }

  if (loading) {
    return <div className="auth-loading">Checking your admin permissions…</div>
  }

  if (!authorized) {
    return <main className="dashboard-shell admin-shell"><Sidebar active={active} setActive={setActive} /><div className="dashboard-main"><header className="dashboard-header"><div className="dashboard-search"><span>Administration</span></div><CourseSearch className="global-header-search" /><div className="profile-actions"><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="dashboard-content"><section className="admin-access-denied"><h1>Access denied</h1><p>Your Clerk account is not marked as an administrator for CodeCraft.</p><button type="button" className="button" onClick={() => navigate('/')}>Back to home</button></section></div></div></main>
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'community', label: 'Community' },
    { id: 'projects', label: 'Projects' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <main className="dashboard-shell admin-shell">
      <Sidebar active={active} setActive={setActive} />
      <div className="dashboard-main">
        <header className="dashboard-header admin-header">
          <div className="dashboard-search"><span>Admin Control Center</span></div>
          <CourseSearch className="global-header-search" />
          <div className="profile-actions"><NotificationBell /><UserButton afterSignOutUrl="/" /></div>
        </header>

        <div className="dashboard-content admin-content">
          <section className="admin-topbar">
            <div>
              <span className="section-kicker">OPERATIONS</span>
              <h1>Admin dashboard</h1>
            </div>
            <label className="admin-search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, posts, projects…" />
            </label>
          </section>

          <nav className="admin-tabs" aria-label="Admin sections">
            {tabs.map((tab) => (
              <button type="button" key={tab.id} className={selectedTab === tab.id ? 'is-active' : ''} onClick={() => setSelectedTab(tab.id)}>{tab.label}</button>
            ))}
          </nav>

          {selectedTab === 'overview' && (
            <>
              <section className="admin-grid stats-grid">
                <article className="admin-card admin-stat"><span>Total users</span><strong>{overview.totalUsers}</strong></article>
                <article className="admin-card admin-stat"><span>Community posts</span><strong>{overview.totalPosts}</strong></article>
                <article className="admin-card admin-stat"><span>Projects</span><strong>{overview.totalProjects}</strong></article>
                <article className="admin-card admin-stat"><span>Announcements</span><strong>{overview.publishedAnnouncements}</strong></article>
                <article className="admin-card admin-stat"><span>Reports</span><strong>{overview.totalReports}</strong></article>
                <article className="admin-card admin-stat"><span>Certificates</span><strong>{overview.totalCertificates}</strong></article>
              </section>

              <section className="admin-grid two-col">
                <article className="admin-card">
                  <h3>Quick actions</h3>
                  <div className="admin-actions-list">
                    <button type="button" onClick={() => setSelectedTab('users')}>Manage Users</button>
                    <button type="button" onClick={() => setSelectedTab('community')}>Manage Community</button>
                    <button type="button" onClick={() => setSelectedTab('projects')}>Manage Projects</button>
                    <button type="button" onClick={() => setSelectedTab('announcements')}>Announcements</button>
                    <button type="button" onClick={() => setSelectedTab('settings')}>Settings</button>
                  </div>
                </article>
                <article className="admin-card">
                  <h3>Recent admin activity</h3>
                  {auditLogs.length ? (
                    <ul className="admin-list compact-list">
                      {auditLogs.slice(0, 6).map((entry) => (
                        <li key={entry.id}><strong>{entry.action}</strong><span>{new Date(entry.created_at).toLocaleString()}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-empty">No admin activity yet.</p>
                  )}
                </article>
              </section>
            </>
          )}

          {selectedTab === 'users' && (
            <section className="admin-card">
              <h3>Users</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length ? filteredUsers.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <div className="admin-user-cell">
                            <span className="admin-avatar">{(entry.username || 'CC').slice(0, 2).toUpperCase()}</span>
                            <div>
                              <strong>{entry.username || 'CodeCraft member'}</strong>
                              <small>{entry.clerk_user_id}</small>
                            </div>
                          </div>
                        </td>
                        <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                        <td><span className="admin-pill">Active</span></td>
                        <td>{entry.isAdmin ? 'Admin' : 'Member'}</td>
                        <td>
                          <button type="button" className="button button-small" onClick={() => handleRoleToggle(entry.clerk_user_id, entry.isAdmin)}>
                            {entry.isAdmin ? 'Remove admin' : 'Promote to admin'}
                          </button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="5"><p className="admin-empty">No matching users found.</p></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedTab === 'community' && (
            <section className="admin-card">
              <h3>Community moderation</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Author</th>
                      <th>Type</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length ? filteredPosts.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.content?.slice(0, 80) || 'Untitled post'}</td>
                        <td>{entry.clerk_user_id}</td>
                        <td>{entry.post_type || 'discussion'}</td>
                        <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                        <td><button type="button" className="button button-small" onClick={() => handleDeletePost(entry.id)}>Delete</button></td>
                      </tr>
                    )) : <tr><td colSpan="5"><p className="admin-empty">No community posts found.</p></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedTab === 'projects' && (
            <section className="admin-card">
              <h3>Projects</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>Language</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length ? projects.filter((entry) => (!query.trim() ? true : `${entry.title || ''} ${entry.clerk_user_id || ''}`.toLowerCase().includes(query.trim().toLowerCase()))).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.title || 'Untitled project'}</td>
                        <td>{entry.clerk_user_id}</td>
                        <td>{entry.language || 'HTML'}</td>
                        <td>{new Date(entry.updated_at || entry.created_at).toLocaleDateString()}</td>
                      </tr>
                    )) : <tr><td colSpan="4"><p className="admin-empty">No projects found.</p></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedTab === 'announcements' && (
            <section className="admin-grid two-col">
              <article className="admin-card">
                <h3>Create announcement</h3>
                <div className="admin-form">
                  <label>
                    <span>Title</span>
                    <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="New challenge available" />
                  </label>
                  <label>
                    <span>Body</span>
                    <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} rows="6" placeholder="Share an update with the CodeCraft community." />
                  </label>
                  <button type="button" className="button" onClick={handleCreateAnnouncement}>Publish announcement</button>
                </div>
              </article>
              <article className="admin-card">
                <h3>Existing announcements</h3>
                {announcements.length ? <ul className="admin-list">
                  {announcements.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{entry.title}</strong>
                        <p>{entry.body}</p>
                      </div>
                      <span className={`admin-pill ${entry.is_published ? 'good' : ''}`}>{entry.is_published ? 'Published' : 'Draft'}</span>
                    </li>
                  ))}
                </ul> : <p className="admin-empty">No announcements yet.</p>}
              </article>
            </section>
          )}

          {selectedTab === 'analytics' && (
            <section className="admin-card">
              <h3>Analytics</h3>
              <div className="admin-grid stats-grid compact-grid">
                <article className="admin-card admin-stat"><span>New users</span><strong>{users.length}</strong></article>
                <article className="admin-card admin-stat"><span>Active posts</span><strong>{posts.length}</strong></article>
                <article className="admin-card admin-stat"><span>Published announcements</span><strong>{announcements.filter((entry) => entry.is_published).length}</strong></article>
                <article className="admin-card admin-stat"><span>Projects created</span><strong>{projects.length}</strong></article>
              </div>
            </section>
          )}

          {selectedTab === 'settings' && (
            <section className="admin-grid two-col">
              <article className="admin-card">
                <h3>Site settings</h3>
                <div className="admin-form">
                  <label className="toggle-row"><input type="checkbox" checked={Boolean(settings.maintenance_mode)} onChange={(event) => handleSaveSetting('maintenance_mode', event.target.checked)} /><span>Maintenance mode</span></label>
                  <label className="toggle-row"><input type="checkbox" checked={Boolean(settings.community_enabled)} onChange={(event) => handleSaveSetting('community_enabled', event.target.checked)} /><span>Community enabled</span></label>
                  <label>
                    <span>Feature flags</span>
                    <textarea value={settings.feature_flags || '[]'} rows="4" onChange={(event) => handleSaveSetting('feature_flags', event.target.value)} />
                  </label>
                </div>
              </article>
              <article className="admin-card">
                <h3>Audit log</h3>
                {auditLogs.length ? <ul className="admin-list compact-list">{auditLogs.slice(0, 10).map((entry) => <li key={entry.id}><strong>{entry.action}</strong><span>{new Date(entry.created_at).toLocaleString()}</span></li>)}</ul> : <p className="admin-empty">No activity logged yet.</p>}
              </article>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

function CodeEditorPage({ active, setActive }) {
  const { user } = useUser()
  const { isLoaded, isSignedIn } = useAuth()
  const userId = user?.id

  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeFileId, setActiveFileId] = useState(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [filePendingDeletion, setFilePendingDeletion] = useState(null)
  const [projectPendingRename, setProjectPendingRename] = useState(null)
  const [projectRenameName, setProjectRenameName] = useState('')
  const [projectPendingDeletion, setProjectPendingDeletion] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [projectLanguage, setProjectLanguage] = useState('HTML')
  const [projectTemplate, setProjectTemplate] = useState('blank')
  const [projectRenameError, setProjectRenameError] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileLanguage, setFileLanguage] = useState('HTML')
  const [projectError, setProjectError] = useState('')
  const [fileError, setFileError] = useState('')
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [editorTheme, setEditorTheme] = useState('dark')
  const [language, setLanguage] = useState('HTML')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [runStatus, setRunStatus] = useState('Ready')
  const [activeConsoleTab, setActiveConsoleTab] = useState('terminal')
  const [terminalOutput, setTerminalOutput] = useState(['✓ CodeCraft editor ready.'])
  const [consoleOutput, setConsoleOutput] = useState([])
  const [errors, setErrors] = useState([])
  const [previewDoc, setPreviewDoc] = useState('')
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectOperation, setProjectOperation] = useState('')
  const [projectDataError, setProjectDataError] = useState('')
  const fileWriteQueueRef = useRef(Promise.resolve())
  const previewFrameRef = useRef(null)
  const previewRunIdRef = useRef(0)

  const getLanguageMeta = (fileName = '', explicitLanguage = null) => {
    const normalizedName = (fileName || '').toLowerCase()
    const explicit = explicitLanguage || ''

    if (explicit === 'HTML' || /\.(html?|htm)$/.test(normalizedName) || normalizedName.includes('html')) {
      return { label: 'HTML', icon: '<>', extension: 'html', language: 'HTML' }
    }
    if (explicit === 'CSS' || /\.css$/i.test(normalizedName) || normalizedName.includes('css')) {
      return { label: 'CSS', icon: 'CSS', extension: 'css', language: 'CSS' }
    }
    if (explicit === 'JavaScript' || /\.m?js$/i.test(normalizedName) || normalizedName.includes('javascript')) {
      return { label: 'JavaScript', icon: 'JS', extension: 'js', language: 'JavaScript' }
    }
    if (explicit === 'TypeScript' || /\.tsx?$/i.test(normalizedName) || normalizedName.includes('typescript')) {
      return { label: 'TypeScript', icon: 'TS', extension: 'ts', language: 'TypeScript' }
    }
    if (explicit === 'React' || /\.(jsx|tsx)$/i.test(normalizedName) || normalizedName.includes('react')) {
      return { label: 'React', icon: '⚛', extension: 'jsx', language: 'React' }
    }
    if (explicit === 'Python' || /\.py$/i.test(normalizedName) || normalizedName.includes('python')) {
      return { label: 'Python', icon: 'PY', extension: 'py', language: 'Python' }
    }
    if (explicit === 'Java' || /\.java$/i.test(normalizedName) || normalizedName.includes('java')) {
      return { label: 'Java', icon: 'JAVA', extension: 'java', language: 'Java' }
    }
    if (explicit === 'C' || /\.c$/i.test(normalizedName) || normalizedName.includes('c')) {
      return { label: 'C', icon: 'C', extension: 'c', language: 'C' }
    }
    if (explicit === 'C++' || /\.(cc|cpp|cxx)$/i.test(normalizedName) || normalizedName.includes('c++')) {
      return { label: 'C++', icon: 'C++', extension: 'cpp', language: 'C++' }
    }
    if (explicit === 'PHP' || /\.php$/i.test(normalizedName) || normalizedName.includes('php')) {
      return { label: 'PHP', icon: 'PHP', extension: 'php', language: 'PHP' }
    }
    if (explicit === 'Node.js' || /\.(mjs|cjs|js)$/i.test(normalizedName) || normalizedName.includes('node')) {
      return { label: 'Node.js', icon: 'NODE', extension: 'js', language: 'Node.js' }
    }
    return { label: 'Text', icon: 'TXT', extension: 'txt', language: 'Text' }
  }

  const getSuggestedFileName = (selectedLanguage = 'HTML') => {
    const suggestions = {
      HTML: 'index.html',
      CSS: 'style.css',
      JavaScript: 'script.js',
      TypeScript: 'app.ts',
      React: 'App.jsx',
      Python: 'main.py',
      Java: 'Main.java',
      C: 'main.c',
      'C++': 'main.cpp',
      PHP: 'server.php',
      'Node.js': 'server.js',
    }

    return suggestions[selectedLanguage] || 'untitled.txt'
  }

  const normalizeFileName = (rawName, selectedLanguage = 'HTML') => {
    const trimmed = String(rawName || '').trim()
    if (!trimmed) return getSuggestedFileName(selectedLanguage)

    const sanitized = trimmed
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/^\.+/, '')

    if (!sanitized) return getSuggestedFileName(selectedLanguage)

    const hasExtension = /\.[a-zA-Z0-9]+$/.test(sanitized)
    if (hasExtension) return sanitized

    const extensionMap = {
      HTML: 'html',
      CSS: 'css',
      JavaScript: 'js',
      TypeScript: 'ts',
      React: 'jsx',
      Python: 'py',
      Java: 'java',
      C: 'c',
      'C++': 'cpp',
      PHP: 'php',
      'Node.js': 'js',
    }

    const extension = extensionMap[selectedLanguage] || 'txt'
    return `${sanitized}.${extension}`
  }

  const getStarterTemplate = (selectedLanguage = 'HTML', fileName = 'index.html') => {
    const baseName = fileName || 'index.html'

    switch (selectedLanguage) {
      case 'HTML':
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Project</title>
  </head>
  <body>
    <main>
      <h1>Hello from ${baseName}</h1>
      <p>Start building your project here.</p>
    </main>
  </body>
</html>`
      case 'CSS':
        return `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #061b36, #0d2e59);
  color: #eaf4ff;
}

main {
  padding: 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}`
      case 'JavaScript':
        return `console.log('Hello from ${baseName}!')

const heading = document.querySelector('h1')
if (heading) {
  heading.textContent = 'Your JavaScript is running.'
}`
      case 'TypeScript':
        return `const message: string = 'Hello from ${baseName}!'
console.log(message)
` 
      case 'React':
        return `export default function App() {
  return (
    <main>
      <h1>Hello from ${baseName}</h1>
      <p>Build a beautiful experience here.</p>
    </main>
  )
}`
      case 'Python':
        return `print('Hello from ${baseName}!')
`
      case 'Java':
        return `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from ${baseName}!");
  }
}`
      case 'C':
        return `#include <stdio.h>

int main() {
  printf("Hello from ${baseName}!\\n");
  return 0;
}`
      case 'C++':
        return `#include <iostream>
using namespace std;

int main() {
  cout << "Hello from ${baseName}!" << endl;
  return 0;
}`
      case 'PHP':
        return `<?php

echo "Hello from ${baseName}!";
` 
      case 'Node.js':
        return `console.log('Hello from ${baseName}!')
` 
      default:
        return `// Start coding here\n`
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadProjects = async () => {
      if (!isLoaded || !isSignedIn || !userId) return
      setProjectsLoading(true)
      setProjectDataError('')

      if (!hasSupabaseConfig) {
        setProjects([])
        setActiveProjectId(null)
        setActiveFileId(null)
        setProjectsLoading(false)
        setProjectDataError('Supabase is unavailable. Check the Supabase environment variables.')
        return
      }

      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (projectError) throw projectError

      const userProjects = (projectRows || []).filter((project) => {
        const owner = project.clerk_user_id || project.user_id
        return owner === userId
      })

      const nextProjects = await Promise.all((userProjects || []).map(async (project) => {
        const { data: files, error: fileError } = await supabase
          .from('project_files')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true })
        if (fileError) throw fileError

        const userFiles = (files || []).filter((file) => {
          const owner = file.clerk_user_id || file.user_id
          return owner === userId || !owner
        })

        return {
          id: project.id,
          name: project.title || project.name || 'Untitled project',
          language: userFiles?.[0]?.language || project.language || 'HTML',
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          files: (userFiles || []).map((file) => ({ ...file, createdAt: file.created_at, updatedAt: file.updated_at })),
        }
      }))
      const nextActiveProject = nextProjects[0] || null

      setProjects(nextProjects)
      setActiveProjectId(nextActiveProject?.id || null)
      setActiveFileId(nextActiveProject?.files[0]?.id || null)
      setProjectsLoading(false)
    }

    loadProjects().catch((error) => {
      if (cancelled) return
      setProjects([])
      setActiveProjectId(null)
      setActiveFileId(null)
      setProjectsLoading(false)
      setProjectDataError(`Unable to load device projects: ${error.message}`)
    })

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId])

  useEffect(() => {
    if (!isProjectModalOpen && !isFileModalOpen && !filePendingDeletion && !projectPendingRename && !projectPendingDeletion) return undefined

    const handleModalKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setIsProjectModalOpen(false)
      setIsFileModalOpen(false)
      setFilePendingDeletion(null)
      setProjectPendingRename(null)
      setProjectPendingDeletion(null)
    }

    window.addEventListener('keydown', handleModalKeyDown)
    return () => window.removeEventListener('keydown', handleModalKeyDown)
  }, [isProjectModalOpen, isFileModalOpen, filePendingDeletion, projectPendingRename, projectPendingDeletion])

  useEffect(() => {
    if (!activeProjectId || !projects.length) {
      setActiveFileId(null)
      return
    }

    const project = projects.find((item) => item.id === activeProjectId)
    if (!project) {
      setActiveProjectId(projects[0]?.id || null)
      return
    }

    const hasActiveFile = project.files.some((file) => file.id === activeFileId)
    if (!project.files.length) {
      setActiveFileId(null)
      return
    }

    if (!hasActiveFile) {
      setActiveFileId(project.files[0].id)
    }
  }, [projects, activeProjectId, activeFileId])

  useEffect(() => {
    if (!activeProjectId) return
    const project = projects.find((item) => item.id === activeProjectId)
    const activeProjectFile = project?.files.find((file) => file.id === activeFileId)
    if (activeProjectFile) {
      setLanguage(activeProjectFile.language || getLanguageMeta(activeProjectFile.name).language)
    } else if (project) {
      setLanguage(project.language || 'HTML')
    }
  }, [activeProjectId, activeFileId, projects])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== previewFrameRef.current?.contentWindow) return
      if (event.data?.runId !== previewRunIdRef.current) return

      if (event.data.type === 'console') {
        setConsoleOutput((previous) => [...previous.slice(-6), event.data.payload])
        setActiveConsoleTab('console')
      }

      if (event.data.type === 'error') {
        const message = String(event.data.payload || 'Unknown runtime error')
        setErrors((previous) => [...previous.slice(-4), { message }])
        setActiveConsoleTab('errors')
        setRunStatus('Runtime error')
      }

      if (event.data.type === 'complete') {
        const failed = Boolean(event.data.payload?.failed)
        setRunStatus(failed ? 'Runtime error' : 'Code executed successfully')
        setTerminalOutput((previous) => [...previous.slice(-3), failed
          ? '✕ Project preview finished with an error.'
          : '✓ Project preview loaded successfully.'])
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const activeProject = projects.find((project) => project.id === activeProjectId) || null
  const activeProjectFiles = activeProject?.files || []
  const activeFile = activeProjectFiles.find((file) => file.id === activeFileId) || null
  const currentFileContent = activeFile?.content || ''

  const handleSave = async () => {
    if (!activeProjectId || !activeProject) {
      setProjectDataError('Create or open a project before saving.')
      setSaveStatus('Save failed')
      return
    }

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      setSaveStatus('Save failed')
      return
    }

    const nextUpdatedAt = new Date().toISOString()

    try {
      const projectToSave = { ...activeProject, updatedAt: nextUpdatedAt }
      const { error } = await supabase.from('projects').update({
        title: projectToSave.name,
        name: projectToSave.name,
        language: projectToSave.language || projectToSave.files?.[0]?.language || 'HTML',
        updated_at: nextUpdatedAt,
      }).eq('id', activeProjectId).eq('clerk_user_id', userId)
      if (error) throw error

      setProjects((previousProjects) => previousProjects.map((project) => project.id === activeProjectId
        ? projectToSave
        : project))

      setProjectDataError('')
      setSaveStatus('Saved')
      setTerminalOutput((previous) => [...previous.slice(-3), '✓ Project saved successfully.'])
    } catch (error) {
      setProjectDataError(`Unable to save project: ${error.message}`)
      setSaveStatus('Save failed')
    }
  }

  const updateCurrentFile = async (value) => {
    if (!activeProjectId || !activeFileId) return

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      setSaveStatus('Save failed')
      return
    }

    const updatedAt = new Date().toISOString()

    setProjects((previousProjects) => previousProjects.map((project) => {
      if (project.id !== activeProjectId) return project

      return {
        ...project,
        files: project.files.map((file) => file.id === activeFileId ? { ...file, content: value, updatedAt } : file),
      }
    }))

    setSaveStatus('Unsaved changes')

    const projectId = activeProjectId
    const fileId = activeFileId
    fileWriteQueueRef.current = fileWriteQueueRef.current.catch(() => {}).then(async () => {
      const { error } = await supabase.from('project_files').update({ content: value, updated_at: updatedAt }).eq('id', fileId).eq('project_id', projectId).eq('clerk_user_id', userId)
      if (error) throw error
    })

    try {
      await fileWriteQueueRef.current
    } catch (error) {
      setProjectDataError(`Unable to save file: ${error.message}`)
      setSaveStatus('Save failed')
      return
    }

    setSaveStatus('Saved')
  }

  const updateCurrentLanguage = async (nextLanguage) => {
    setLanguage(nextLanguage)

    if (!activeProjectId || !activeFileId) return

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    setProjects((previousProjects) => previousProjects.map((project) => {
      if (project.id !== activeProjectId) return project

      return {
        ...project,
        files: project.files.map((file) => file.id === activeFileId ? { ...file, language: nextLanguage, updatedAt: new Date().toISOString() } : file),
      }
    }))

    try {
      const { error } = await supabase.from('project_files').update({ language: nextLanguage, updated_at: new Date().toISOString() }).eq('id', activeFileId).eq('project_id', activeProjectId).eq('clerk_user_id', userId)
      if (error) throw error
    } catch (error) {
      setProjectDataError(`Unable to save file language: ${error.message}`)
      setSaveStatus('Save failed')
      return
    }

    setSaveStatus('Saved')
  }

  const handleRun = () => {
    if (!activeProject || !activeProject.files.length) {
      setRunStatus('No files yet')
      setTerminalOutput((previous) => [...previous.slice(-2), '📄 Create a file to preview your project.'])
      setPreviewDoc('')
      return
    }

    const htmlFileByName = activeProject.files.find((file) => /\.(html?|htm)$/i.test(file.name))
    const htmlFile = htmlFileByName || activeProject.files.find((file) =>
      /\.(m?js|cjs)$/i.test(file.name) && /^\s*(?:<!doctype\s+html\b|<html(?:\s|>))/i.test(file.content || ''),
    )
    const cssFiles = activeProject.files.filter((file) => /\.css$/i.test(file.name))
    const jsFiles = activeProject.files.filter((file) => /\.(m?js|cjs)$/i.test(file.name) && file.id !== htmlFile?.id)

    if (!htmlFile && !cssFiles.length && !jsFiles.length) {
      setRunStatus('No front-end files found')
      setTerminalOutput((previous) => [...previous.slice(-2), 'Create an HTML, CSS, or JavaScript file to run a front-end preview.'])
      setPreviewDoc('')
      return
    }

    const cssContent = cssFiles.map((file) => file.content).join('\n')
    const jsContent = jsFiles.map((file) => file.content).join('\n')
    const runId = previewRunIdRef.current + 1
    previewRunIdRef.current = runId

    const runner = `
      <script>
        const runId = ${runId}
        const send = (type, payload) => {
          window.parent.postMessage({ type, payload, runId }, '*')
        }

        const originalConsole = {
          log: console.log.bind(console),
          warn: console.warn.bind(console),
          error: console.error.bind(console),
          info: console.info.bind(console)
        }

        const createLogger = (method) => (...args) => {
          const message = args.map((arg) => {
            if (typeof arg === 'string') return arg
            if (arg instanceof Error) return arg.message
            try { return JSON.stringify(arg) } catch (error) { return String(arg) }
          }).join(' ')
          originalConsole[method](...args)
          send('console', { level: method, message: method.toUpperCase() + ': ' + message })
        }

        console.log = createLogger('log')
        console.warn = createLogger('warn')
        console.error = createLogger('error')
        console.info = createLogger('info')

        let failed = false
        window.addEventListener('error', (event) => {
          failed = true
          send('error', event.message || 'Runtime error')
        })
        window.addEventListener('unhandledrejection', (event) => {
          failed = true
          send('error', event.reason?.message || String(event.reason || 'Unhandled promise rejection'))
        })

        try {
          const userScript = ${JSON.stringify(jsContent).replace(/</g, '\\u003c')}
          if (userScript.trim()) new Function(userScript)()
        } catch (error) {
          failed = true
          send('error', error?.message || String(error))
        } finally {
          send('complete', { failed })
        }
      </script>
    `

    const previewDocument = new DOMParser().parseFromString(htmlFile?.content || '<main id="app"></main>', 'text/html')
    if (cssContent.trim()) {
      const styleElement = previewDocument.createElement('style')
      styleElement.textContent = cssContent
      previewDocument.head.append(styleElement)
    }
    const runnerElement = previewDocument.createElement('script')
    runnerElement.textContent = runner.replace(/^\s*<script>|<\/script>\s*$/g, '')
    previewDocument.body.append(runnerElement)

    setErrors([])
    setConsoleOutput([])
    setRunStatus('Running...')
    setTerminalOutput((previous) => [...previous.slice(-2), htmlFile && !htmlFileByName
      ? `▶ Detected HTML document in ${htmlFile.name}; rendering it as HTML.`
      : '▶ Running project preview...'])
    setPreviewDoc(`<!doctype html>${previewDocument.documentElement.outerHTML}`)
  }

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setProjectError('Project name is required.')
      return
    }

    if (!hasSupabaseConfig || !userId) {
      setProjectError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    setProjectOperation('create')
    setProjectDataError('')

    let createdProject
    try {
      const { data, error } = await supabase.from('projects').insert({ clerk_user_id: userId, title: trimmedName, name: trimmedName, language: projectLanguage }).select('id, title, name, language, created_at, updated_at').single()
      if (error) throw error
      createdProject = data
    } catch (error) {
      setProjectError(`Unable to create project: ${error.message}`)
      setProjectOperation('')
      return
    }

    const nextProject = {
      id: createdProject.id,
      name: createdProject.title || createdProject.name,
      language: projectLanguage,
      createdAt: createdProject.created_at,
      updatedAt: createdProject.updated_at,
      files: [],
    }

    setProjects((previous) => [nextProject, ...previous])
    setActiveProjectId(createdProject.id)
    setActiveFileId(null)
    setProjectName('')
    setProjectLanguage('HTML')
    setProjectTemplate('blank')
    setProjectError('')
    setIsProjectModalOpen(false)
    setTerminalOutput((previous) => [...previous.slice(-2), `✓ Created project: ${trimmedName}`])
    setProjectOperation('')
  }

  const openProjectRename = (project) => {
    setProjectPendingRename(project)
    setProjectRenameName(project.name)
    setProjectRenameError('')
  }

  const handleRenameProject = async () => {
    if (!projectPendingRename) return
    const trimmedName = projectRenameName.trim()
    if (!trimmedName) {
      setProjectRenameError('Project name is required.')
      return
    }

    if (!hasSupabaseConfig || !userId) {
      setProjectRenameError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    setProjectOperation('rename')
    setProjectDataError('')

    const updatedAt = new Date().toISOString()
    try {
      const { error } = await supabase.from('projects').update({ title: trimmedName, name: trimmedName }).eq('id', projectPendingRename.id).eq('clerk_user_id', userId)
      if (error) throw error
    } catch (error) {
      setProjectRenameError(`Unable to rename project: ${error.message}`)
      setProjectOperation('')
      return
    }

    setProjects((previous) => previous.map((project) => project.id === projectPendingRename.id
      ? { ...project, name: trimmedName, updatedAt }
      : project))
    setProjectPendingRename(null)
    setProjectRenameName('')
    setProjectRenameError('')
    setProjectOperation('')
  }

  const handleDeleteProject = (project) => {
    setProjectPendingDeletion(project)
  }

  const confirmDeleteProject = async () => {
    if (!projectPendingDeletion) return

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    setProjectOperation('delete')
    setProjectDataError('')

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectPendingDeletion.id).eq('clerk_user_id', userId)
      if (error) throw error
    } catch (error) {
      setProjectDataError(`Unable to delete project: ${error.message}`)
      setProjectOperation('')
      return
    }

    const remainingProjects = projects.filter((project) => project.id !== projectPendingDeletion.id)
    setProjects(remainingProjects)
    setProjectPendingDeletion(null)

    if (projectPendingDeletion.id === activeProjectId) {
      const nextProject = remainingProjects[0] || null
      setActiveProjectId(nextProject?.id || null)
      setActiveFileId(nextProject?.files[0]?.id || null)
      setPreviewDoc('')
      setConsoleOutput([])
      setErrors([])
    }

    setProjectOperation('')
  }

  const handleCreateFile = () => {
    if (!activeProject) return

    const trimmedName = fileName.trim()
    if (!trimmedName) {
      setFileError('File name is required.')
      return
    }

    const normalizedName = normalizeFileName(trimmedName, fileLanguage)
    const inferredLanguage = getLanguageMeta(normalizedName).language
    const resolvedLanguage = inferredLanguage === 'Text' ? fileLanguage : inferredLanguage
    const alreadyExists = activeProject.files.some((file) => file.name.toLowerCase() === normalizedName.toLowerCase())
    if (alreadyExists) {
      setFileError('A file with this name already exists in the project.')
      return
    }

    if (!hasSupabaseConfig || !userId) {
      setFileError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    const createFile = async () => {
      setProjectOperation('file-create')
      const content = getStarterTemplate(resolvedLanguage, normalizedName)
      let createdFile
      try {
        const { data, error } = await supabase.from('project_files').insert({ clerk_user_id: userId, project_id: activeProjectId, name: normalizedName, path: normalizedName, content, language: resolvedLanguage }).select('id, name, path, content, language, created_at, updated_at').single()
        if (error) throw error
        createdFile = data
      } catch (error) {
        setFileError(`Unable to create file: ${error.message}`)
        setProjectOperation('')
        return
      }

      const nextFile = {
        id: createdFile.id,
        name: createdFile.name,
        path: createdFile.path,
        language: createdFile.language,
        content: createdFile.content,
        createdAt: createdFile.created_at,
        updatedAt: createdFile.updated_at,
      }

      setProjects((previous) => previous.map((project) => {
        if (project.id !== activeProjectId) return project
        return { ...project, files: [...project.files, nextFile] }
      }))

      setActiveFileId(nextFile.id)
      setFileName('')
      setFileLanguage(resolvedLanguage)
      setFileError('')
      setIsFileModalOpen(false)
      setSaveStatus('Saved')
      setProjectOperation('')
    }

    createFile().catch((error) => {
      setFileError(`Unable to create file: ${error.message}`)
      setProjectOperation('')
    })
  }

  const handleRenameFile = async (file = activeFile) => {
    if (!file) return
    const nextName = window.prompt('Rename file', file.name)
    if (nextName === null) return

    const normalized = normalizeFileName(nextName, file.language)
    if (!normalized.trim()) return

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    const updatedAt = new Date().toISOString()
    try {
      const { error } = await supabase.from('project_files').update({ name: normalized, path: normalized }).eq('id', file.id).eq('project_id', activeProjectId).eq('clerk_user_id', userId)
      if (error) throw error
    } catch (error) {
      setProjectDataError(`Unable to rename file: ${error.message}`)
      return
    }

    setProjects((previous) => previous.map((project) => {
      if (project.id !== activeProjectId) return project
      return {
        ...project,
        files: project.files.map((projectFile) => projectFile.id === file.id ? { ...projectFile, name: normalized, path: normalized, updatedAt } : projectFile),
      }
    }))
    setSaveStatus('Unsaved changes')
  }

  const handleDeleteFile = (file = activeFile) => {
    if (!file) return
    setFilePendingDeletion(file)
  }

  const confirmDeleteFile = async () => {
    if (!filePendingDeletion) return

    if (!hasSupabaseConfig || !userId) {
      setProjectDataError('Supabase is unavailable. Check the Supabase environment variables and sign-in state.')
      return
    }

    try {
      const { error } = await supabase.from('project_files').delete().eq('id', filePendingDeletion.id).eq('project_id', activeProjectId).eq('clerk_user_id', userId)
      if (error) throw error
    } catch (error) {
      setProjectDataError(`Unable to delete file: ${error.message}`)
      return
    }

    setProjects((previous) => previous.map((project) => {
      if (project.id !== activeProjectId) return project
      return {
        ...project,
        files: project.files.filter((file) => file.id !== filePendingDeletion.id),
      }
    }))

    if (filePendingDeletion.id === activeFileId) setActiveFileId(null)
    setFilePendingDeletion(null)
    setSaveStatus('Unsaved changes')
  }

  const handleReset = () => {
    if (!activeProject) return
    const confirmed = window.confirm('Reset this project to an empty state?')
    if (!confirmed) return

    setProjects((previous) => previous.map((project) => project.id === activeProjectId ? { ...project, files: [], updatedAt: new Date().toISOString() } : project))
    setActiveFileId(null)
    setRunStatus('Ready')
    setPreviewDoc('')
    setConsoleOutput([])
    setErrors([])
    setTerminalOutput(['✓ Project reset to an empty state.'])
  }

  const toggleTheme = () => {
    setEditorTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      setErrors((previous) => [...previous.slice(-4), { message: 'Fullscreen mode is not available in this browser.' }])
      setActiveConsoleTab('errors')
    }
  }

  const openProject = (projectId) => {
    setActiveProjectId(projectId)
    const project = projects.find((item) => item.id === projectId)
    const firstFile = project?.files[0]
    setActiveFileId(firstFile?.id || null)
  }

  const projectNameForDisplay = activeProject?.name || 'My Project'

  return (
    <main className={`dashboard-shell ${editorTheme}`}>
      <Sidebar active={active} setActive={setActive} />
      <div className="dashboard-main">
        <header className={`dashboard-header code-editor-header ${editorTheme}`}>
          <div className="editor-header-brand">
            <img src="/codecraft-icon.png" alt="CodeCraft" className="editor-mini-logo" />
            <div>
              <strong>CodeCraft</strong>
              <span>Code Editor</span>
            </div>
          </div>
          <CourseSearch className="global-header-search" />
          <div className="profile-actions">
            <AdminHeaderAction />
            <NotificationBell />
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '33px', height: '33px' }, userButtonTrigger: { border: 'none', boxShadow: 'none', background: 'transparent' }, userButtonPopoverCard: { borderRadius: '14px' } } }} />
          </div>
        </header>

        <div className={`code-editor-page ${editorTheme}`}>
          <div className="editor-toolbar">
            <div className="editor-toolbar-group left-group">
              <span className="editor-brand-badge">CodeCraft</span>
              <span className="toolbar-divider" />
              <div className="project-selector-wrap">
                <button type="button" className="project-selector" disabled={projectsLoading} onClick={() => setIsProjectMenuOpen((current) => !current)}>
                  <span>{projectsLoading ? 'Loading projects...' : projectNameForDisplay}</span>
                  <span className="project-selector-chevron">⌄</span>
                </button>
                {isProjectMenuOpen && (
                  <div className="project-menu">
                    {projects.map((project) => (
                      <div key={project.id} className={`project-menu-row ${activeProjectId === project.id ? 'is-active' : ''}`}>
                        <button
                          type="button"
                          className="project-menu-item"
                          onClick={() => {
                            openProject(project.id)
                            setIsProjectMenuOpen(false)
                          }}
                        >
                          <Folder className="project-folder-icon" size={14} strokeWidth={2} aria-hidden="true" />
                          <span>{project.name}</span>
                        </button>
                        <div className="project-menu-actions">
                          <button type="button" className="file-icon-action rename-action" aria-label={`Rename ${project.name}`} title="Rename Project" onClick={(event) => { event.stopPropagation(); setIsProjectMenuOpen(false); openProjectRename(project) }}>
                            <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <button type="button" className="file-icon-action delete-action" aria-label={`Delete ${project.name}`} title="Delete Project" onClick={(event) => { event.stopPropagation(); setIsProjectMenuOpen(false); handleDeleteProject(project) }}>
                            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="project-menu-create" disabled={Boolean(projectOperation)} onClick={() => { setIsProjectMenuOpen(false); setIsProjectModalOpen(true) }}>+ Create New Project</button>
                  </div>
                )}
              </div>
            </div>

            <div className="editor-toolbar-group center-group">
              <label className="editor-select-wrap">
                <span>Language</span>
                <select value={language} onChange={(event) => updateCurrentLanguage(event.target.value)}>
                  <option value="HTML">HTML</option>
                  <option value="CSS">CSS</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="React">React</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C">C</option>
                  <option value="C++">C++</option>
                  <option value="PHP">PHP</option>
                  <option value="Node.js">Node.js</option>
                </select>
              </label>
              <button type="button" className="editor-action primary" onClick={handleRun}>▶ Run</button>
              <button type="button" className="editor-action" onClick={handleSave}>Save</button>
              <button type="button" className="editor-action" onClick={handleReset}>Reset</button>
              <button type="button" className="editor-action" onClick={toggleFullscreen}>Fullscreen</button>
              <button type="button" className="editor-action" onClick={toggleTheme}>{editorTheme === 'dark' ? 'Light' : 'Dark'} Theme</button>
            </div>
          </div>

          <div className="mobile-editor-bar">
            <details className="mobile-project-disclosure">
              <summary>{projectsLoading ? 'Loading projects...' : projectNameForDisplay}</summary>
              <div className="mobile-project-list">
                {projects.map((project) => (
                  <div key={project.id} className={`mobile-project-row ${activeProjectId === project.id ? 'is-active' : ''}`}>
                    <button type="button" className="mobile-project-select" onClick={() => openProject(project.id)}>{project.name}</button>
                    <button type="button" className="mobile-project-action" aria-label={`Rename ${project.name}`} onClick={() => openProjectRename(project)}><Pencil size={14} /></button>
                    <button type="button" className="mobile-project-action" aria-label={`Delete ${project.name}`} onClick={() => handleDeleteProject(project)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" className="mobile-project-create" disabled={Boolean(projectOperation)} onClick={() => setIsProjectModalOpen(true)}>+ Create New Project</button>
              </div>
            </details>
            <button type="button" className="mobile-tools-toggle" aria-expanded={isMobileToolsOpen} onClick={() => setIsMobileToolsOpen((current) => !current)}>
              {isMobileToolsOpen ? 'Close tools' : 'Tools'}
            </button>
          </div>

          {isMobileToolsOpen && (
            <div className="mobile-editor-menu" aria-label="Editor tools">
              <label className="editor-select-wrap mobile-language-select">
                <span>Language</span>
                <select value={language} onChange={(event) => updateCurrentLanguage(event.target.value)}>
                  <option value="HTML">HTML</option>
                  <option value="CSS">CSS</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="React">React</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C">C</option>
                  <option value="C++">C++</option>
                  <option value="PHP">PHP</option>
                  <option value="Node.js">Node.js</option>
                </select>
              </label>
              <div className="mobile-editor-actions">
                <button type="button" className="editor-action primary" onClick={handleRun}>Run</button>
                <button type="button" className="editor-action" onClick={handleSave}>Save</button>
                <button type="button" className="editor-action" onClick={handleReset}>Reset</button>
                <button type="button" className="editor-action" onClick={toggleFullscreen}>Fullscreen</button>
                <button type="button" className="editor-action" onClick={toggleTheme}>{editorTheme === 'dark' ? 'Light' : 'Dark'} Theme</button>
              </div>
            </div>
          )}

          {projectDataError && <div className="project-data-error" role="status">{projectDataError}</div>}

          <div className="editor-workspace">
            <aside className="editor-file-panel">
              <div className="panel-header file-header">
                <span className="section-kicker">FILES</span>
                <button type="button" className="file-create-button" aria-label="Create file" onClick={() => setIsFileModalOpen(true)}>+</button>
              </div>

              <div className="project-stack">
                <div className="project-root"><span className="folder-icon">📁</span> {projectNameForDisplay}</div>
                {activeProjectFiles.length === 0 ? (
                  <div className="empty-file-state">
                    <span className="empty-file-icon">📄</span>
                    <strong>No files yet</strong>
                    <p>Create your first file<br />to start coding.</p>
                    <button type="button" className="editor-action primary" onClick={() => setIsFileModalOpen(true)}>+ Create File</button>
                  </div>
                ) : (
                  <div className="file-tree-block">
                    {activeProjectFiles.map((file) => {
                      const meta = getLanguageMeta(file.name, file.language)
                      return (
                        <div key={file.id} className={`file-item-group ${activeFileId === file.id ? 'is-active' : ''}`}>
                          <button type="button" className="file-item" onClick={() => setActiveFileId(file.id)}>
                            <span className="file-icon">{meta.icon}</span>
                            <span>{file.name}</span>
                          </button>
                          <div className="file-actions">
                            <button type="button" className="file-icon-action rename-action" aria-label={`Rename ${file.name}`} title="Rename" onClick={(event) => { event.stopPropagation(); handleRenameFile(file) }}>
                              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                            <button type="button" className="file-icon-action delete-action" aria-label={`Delete ${file.name}`} title="Delete" onClick={(event) => { event.stopPropagation(); handleDeleteFile(file) }}>
                              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>

            <section className="editor-main-panel">
              {activeFile ? (
                <>
                  <div className="editor-tabs">
                    {activeProjectFiles.map((file) => {
                      const meta = getLanguageMeta(file.name, file.language)
                      return (
                        <button
                          key={file.id}
                          type="button"
                          className={`editor-tab ${activeFileId === file.id ? 'is-active' : ''}`}
                          onClick={() => setActiveFileId(file.id)}
                        >
                          <span className="tab-icon">{meta.icon}</span>
                          {file.name}
                        </button>
                      )
                    })}
                  </div>

                  <div className="code-editor-surface">
                    <div className="line-numbers" aria-hidden="true">
                      {currentFileContent.split('\n').map((_, index) => (
                        <span key={`${activeFile.id}-${index + 1}`}>{index + 1}</span>
                      ))}
                    </div>
                    <textarea
                      value={currentFileContent}
                      spellCheck={false}
                      className="code-textarea"
                      onChange={(event) => updateCurrentFile(event.target.value)}
                      aria-label={`${activeFile.name} editor`}
                    />
                  </div>
                </>
              ) : (
                <div className="empty-editor-state">
                  <h3>Select a file to start coding</h3>
                </div>
              )}
            </section>

            <aside className="editor-preview-panel">
              <div className="panel-header preview-header">
                <span className="section-kicker">LIVE PREVIEW</span>
                <div className="preview-controls">
                  <button type="button" className={previewDevice === 'desktop' ? 'is-active' : ''} onClick={() => setPreviewDevice('desktop')}>Desktop</button>
                  <button type="button" className={previewDevice === 'tablet' ? 'is-active' : ''} onClick={() => setPreviewDevice('tablet')}>Tablet</button>
                  <button type="button" className={previewDevice === 'mobile' ? 'is-active' : ''} onClick={() => setPreviewDevice('mobile')}>Mobile</button>
                  <button type="button" onClick={handleRun}>Refresh</button>
                </div>
              </div>
              <div className={`preview-frame-wrap ${previewDevice}`}>
                {previewDoc ? (
                  <iframe ref={previewFrameRef} title="Live preview" srcDoc={previewDoc} sandbox="allow-scripts" className="preview-frame" />
                ) : (
                  <div className="preview-placeholder">
                    <span>Run your project to update the preview.</span>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="editor-console-panel">
            <div className="console-tabs">
              <button type="button" className={activeConsoleTab === 'terminal' ? 'is-active' : ''} onClick={() => setActiveConsoleTab('terminal')}>Terminal</button>
              <button type="button" className={activeConsoleTab === 'console' ? 'is-active' : ''} onClick={() => setActiveConsoleTab('console')}>Console</button>
              <button type="button" className={activeConsoleTab === 'errors' ? 'is-active' : ''} onClick={() => setActiveConsoleTab('errors')}>Errors</button>
            </div>

            <div className="console-output">
              {activeConsoleTab === 'terminal' && (
                <div className="terminal-log">
                  {terminalOutput.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
                </div>
              )}

              {activeConsoleTab === 'console' && (
                <div className="terminal-log">
                  {consoleOutput.length > 0 ? consoleOutput.map((entry, index) => <div key={`${entry.message}-${index}`}>{entry.message}</div>) : <div>Console is empty. Run your project to see JavaScript output.</div>}
                </div>
              )}

              {activeConsoleTab === 'errors' && (
                <div className="terminal-log error-log">
                  {errors.length > 0 ? errors.map((entry, index) => <div key={`${entry.message}-${index}`}>✕ {entry.message}</div>) : <div>✓ No errors detected.</div>}
                </div>
              )}
            </div>

            <div className="console-status-bar">
              <span className="status-pill">{runStatus}</span>
              <span className="status-pill subtle">{saveStatus}</span>
            </div>
          </div>
        </div>

        {isProjectModalOpen && (
          <div className="project-modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
            <div className="project-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-title-row"><h3>Create New Project</h3><button type="button" className="modal-close" aria-label="Close" onClick={() => setIsProjectModalOpen(false)}>×</button></div>
              <label>
                <span>Project Name</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="My Portfolio"
                />
              </label>
              <label><span>Choose a template</span></label>
              <div className="template-options">
                <button type="button" className={`template-option ${projectTemplate === 'web' ? 'is-active' : ''}`} onClick={() => { setProjectTemplate('web'); setProjectLanguage('HTML') }}><strong>HTML / CSS</strong><span>JavaScript</span></button>
                <button type="button" className={`template-option ${projectTemplate === 'blank' ? 'is-active' : ''}`} onClick={() => setProjectTemplate('blank')}><strong>Blank</strong><span>Project</span></button>
              </div>
              {projectError && <p className="modal-error">{projectError}</p>}
              <div className="modal-actions">
                <button type="button" className="editor-action" onClick={() => setIsProjectModalOpen(false)} disabled={Boolean(projectOperation)}>Cancel</button>
                <button type="button" className="editor-action primary" onClick={handleCreateProject} disabled={Boolean(projectOperation)}>{projectOperation === 'create' ? 'Creating...' : 'Create Project'}</button>
              </div>
            </div>
          </div>
        )}

        {projectPendingRename && (
          <div className="project-modal-overlay" onClick={() => setProjectPendingRename(null)}>
            <div className="project-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-title-row">
                <h3>Rename Project</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setProjectPendingRename(null)}>×</button>
              </div>
              <label>
                <span>Project name</span>
                <input type="text" value={projectRenameName} onChange={(event) => setProjectRenameName(event.target.value)} autoFocus />
              </label>
              {projectRenameError && <p className="modal-error">{projectRenameError}</p>}
              <div className="modal-actions">
                <button type="button" className="editor-action" onClick={() => setProjectPendingRename(null)} disabled={Boolean(projectOperation)}>Cancel</button>
                <button type="button" className="editor-action primary" onClick={handleRenameProject} disabled={Boolean(projectOperation)}>{projectOperation === 'rename' ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {projectPendingDeletion && (
          <div className="project-modal-overlay delete-modal-overlay" onClick={() => setProjectPendingDeletion(null)}>
            <div className="project-modal delete-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-title-row">
                <h3>Delete Project</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setProjectPendingDeletion(null)}>×</button>
              </div>
              <p className="delete-modal-message">Are you sure you want to delete <strong>&quot;{projectPendingDeletion.name}&quot;</strong>?</p>
              <p className="delete-modal-warning">This will delete the project and its files. This cannot be undone.</p>
              {projectDataError && <p className="modal-error">{projectDataError}</p>}
              <div className="modal-actions">
                <button type="button" className="editor-action" onClick={() => setProjectPendingDeletion(null)} disabled={Boolean(projectOperation)}>Cancel</button>
                <button type="button" className="editor-action destructive" onClick={confirmDeleteProject} disabled={Boolean(projectOperation)}>{projectOperation === 'delete' ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}

        {isFileModalOpen && (
          <div className="project-modal-overlay" onClick={() => setIsFileModalOpen(false)}>
            <div className="project-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-title-row"><h3>Create New File</h3><button type="button" className="modal-close" aria-label="Close" onClick={() => setIsFileModalOpen(false)}>×</button></div>
              <label>
                <span>File Name</span>
                <input
                  type="text"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder={getSuggestedFileName(activeProject?.language || fileLanguage)}
                />
              </label>
              <label>
                <span>File type</span>
                <select value={fileLanguage} onChange={(event) => setFileLanguage(event.target.value)}>
                  <option value="HTML">HTML</option>
                  <option value="CSS">CSS</option>
                  <option value="JavaScript">JavaScript</option>
                </select>
              </label>
              {fileError && <p className="modal-error">{fileError}</p>}
              <div className="modal-actions">
                <button type="button" className="editor-action" onClick={() => setIsFileModalOpen(false)} disabled={Boolean(projectOperation)}>Cancel</button>
                <button type="button" className="editor-action primary" onClick={handleCreateFile} disabled={Boolean(projectOperation)}>{projectOperation === 'file-create' ? 'Creating...' : 'Create File'}</button>
              </div>
            </div>
          </div>
        )}

        {filePendingDeletion && (
          <div className="project-modal-overlay delete-modal-overlay" onClick={() => setFilePendingDeletion(null)}>
            <div className="project-modal delete-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-title-row">
                <h3>Delete File</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setFilePendingDeletion(null)}>×</button>
              </div>
              <p className="delete-modal-message">Are you sure you want to delete <strong>&quot;{filePendingDeletion.name}&quot;</strong>?</p>
              <p className="delete-modal-warning">This action cannot be undone.</p>
              <div className="modal-actions">
                <button type="button" className="editor-action" onClick={() => setFilePendingDeletion(null)}>Cancel</button>
                <button type="button" className="editor-action destructive" onClick={confirmDeleteFile}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )

}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [active, setActive] = useState('home')
  const [accountAccess, setAccountAccess] = useState(null)
  const [siteSettings, setSiteSettings] = useState({})
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    setActive(getActiveRoute(path))
  }, [path])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAccountAccess(null)
      return undefined
    }

    let isMounted = true
    setAccountAccess(null)
    Promise.all([isUserAccountActive(), fetchPublicSiteSettings(), ensureProfileFromClerk(user)]).then(([isActive, settings]) => {
      if (isMounted) {
        setAccountAccess(isActive)
        setSiteSettings(settings)
      }
    })
    return () => { isMounted = false }
  }, [isLoaded, isSignedIn, user])

  const isCodeCraftAppRoute = path === '/' || protectedRoutes.has(path) || (!path.startsWith('/auth') && !landingPlaceholderRoutes[path])

  if (isLoaded && isSignedIn && accountAccess === null && isCodeCraftAppRoute) {
    return <div className="auth-loading">Checking your account access...</div>
  }

  if (isSignedIn && accountAccess === false && isCodeCraftAppRoute) {
    return <main className="account-suspended"><span className="section-kicker">CODECRAFT ACCOUNT</span><h1>Account access paused</h1><p>This account is suspended or banned. Contact CodeCraft support if you believe this is a mistake.</p><UserButton afterSignOutUrl="/" /></main>
  }

  if (isSignedIn && accountAccess && path !== '/admin' && siteSettings.maintenance_mode && isCodeCraftAppRoute) {
    return <main className="account-suspended"><span className="section-kicker">CODECRAFT STATUS</span><h1>Maintenance in progress</h1><p>CodeCraft is temporarily unavailable while maintenance is in progress.</p><UserButton afterSignOutUrl="/" /></main>
  }

  if (isSignedIn && accountAccess && path === '/dashboard' && siteSettings.community_enabled === false) {
    return <main className="account-suspended"><span className="section-kicker">CODECRAFT COMMUNITY</span><h1>Community is unavailable</h1><p>The community is temporarily disabled.</p><UserButton afterSignOutUrl="/" /></main>
  }

  if (path === '/') {
    if (!isLoaded) {
      return <div className="auth-loading">Loading your workspace...</div>
    }

    if (!isSignedIn) {
      return <Landing />
    }

    return <HomePage active={active} setActive={setActive} />
  }

  if (path === '/auth' || path.startsWith('/auth/')) return <AuthPage />
  if (landingPlaceholderRoutes[path]) return <LandingPlaceholder title={landingPlaceholderRoutes[path]} />

  if (path === '/account' || path === '/courses' || path === '/progress' || path === '/settings') {
    if (!isLoaded) {
      return <div className="auth-loading">Loading your workspace...</div>
    }

    if (!isSignedIn) {
      return <AuthPage initialModeOverride="login" />
    }

    if (path === '/courses' || path === '/certificates' || path === '/progress' || path === '/settings') {
      return <AccountPage />
    }

    return <AccountPage />
  }

  if (path === '/admin') {
    if (!isLoaded) {
      return <div className="auth-loading">Loading your workspace...</div>
    }

    if (!isSignedIn) {
      return <AuthPage initialModeOverride="login" />
    }

    return <AdminControlCenter active={active} setActive={setActive} />
  }

  if (protectedRoutes.has(path)) {
    if (!isLoaded) {
      return <div className="auth-loading">Loading your workspace...</div>
    }

    if (!isSignedIn) {
      return <AuthPage initialModeOverride="login" />
    }

    if (accountAccess === null) return <div className="auth-loading">Checking your account access...</div>

    if (path === '/learn') {
      return <LearnPage active={active} setActive={setActive} />
    }

    if (path === '/challenges') return <ChallengeSidebarContext.Provider value={Sidebar}><ChallengesPage active={path.slice(1)} setActive={setActive} /></ChallengeSidebarContext.Provider>
    if (path === '/quizzes') return <QuizzesPage active={path.slice(1)} setActive={setActive} />
    if (path === '/certificates') return <CertificatesPage active={path.slice(1)} setActive={setActive} />

    if (path === '/dashboard') {
      return <CommunityPage active={active} setActive={setActive} />
    }

    if (path === '/profile') {
      return <ProfilePage />
    }

    if (path === '/code-editor') {
      return <CodeEditorPage active={active} setActive={setActive} />
    }

    return <HomePage active={active} setActive={setActive} />
  }

  return <HomePage active={active} setActive={setActive} />
}

function SupabaseAuthBridge({ children }) {
  const { getToken, isLoaded } = useAuth()
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    if (isLoaded) {
      configureSupabaseAccessToken(() => getToken())
      setIsConfigured(true)
    }
  }, [getToken, isLoaded])

  return isLoaded && isConfigured ? <NotificationProvider>{children}</NotificationProvider> : <div className="auth-loading">Loading your workspace...</div>
}

function AppWithClerk() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/" signInUrl="/auth?mode=login" signUpUrl="/auth?mode=signup">
      <SupabaseAuthBridge>
        <App />
      </SupabaseAuthBridge>
    </ClerkProvider>
  )
}

export default AppWithClerk
