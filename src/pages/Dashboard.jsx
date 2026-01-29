import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocuments } from '../hooks/useDocuments'
import { useKanban } from '../hooks/useKanban'
import {
  isGoogleConfigured,
  initiateGoogleAuth,
  getGoogleToken,
  clearGoogleToken,
  fetchCalendarEvents,
  fetchGmailMessages,
} from '../lib/google'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Calendar,
  Mail,
  TrendingUp,
  Newspaper,
  FilePlus,
  ListTodo,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'

// ── Fallback static data ────────────────────────────

const FALLBACK_MARKET = [
  { name: 'Nifty 50', value: '24,857.30', change: '+1.2%', up: true },
  { name: 'Sensex', value: '81,523.16', change: '+0.9%', up: true },
  { name: 'Bank Nifty', value: '52,140.75', change: '-0.3%', up: false },
  { name: 'USD/INR', value: '83.42', change: '+0.1%', up: true },
]

const FALLBACK_NEWS = [
  { title: 'Fed signals potential rate cut in September meeting', source: 'Reuters', time: '2h ago', description: 'The Federal Reserve hinted at possible interest rate reductions as inflation shows signs of cooling.', link: '#' },
  { title: 'AI chip demand drives semiconductor stocks higher', source: 'Bloomberg', time: '4h ago', description: 'Nvidia and AMD lead gains as AI infrastructure spending accelerates globally.', link: '#' },
  { title: 'India GDP growth exceeds forecasts at 7.8%', source: 'Economic Times', time: '5h ago', description: 'India\'s economy surpasses expectations with robust manufacturing and services growth.', link: '#' },
  { title: 'European markets steady amid geopolitical tensions', source: 'FT', time: '6h ago', description: 'Markets show resilience despite ongoing regional conflicts and supply chain concerns.', link: '#' },
  { title: 'RBI holds rates steady, signals cautious optimism', source: 'Mint', time: '7h ago', description: 'Reserve Bank of India maintains repo rate at 6.5%, citing balanced inflation outlook.', link: '#' },
  { title: 'Tech layoffs slow as hiring picks up in AI sector', source: 'TechCrunch', time: '8h ago', description: 'AI-related job postings surge 40% while traditional tech layoffs decline quarter-over-quarter.', link: '#' },
]

// ── Helper: time-based greeting & subtitle ─────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return { greeting: 'Burning the midnight oil', emoji: '🌙', subtitle: 'The quiet hours fuel the biggest ideas.' }
  if (h < 12) return { greeting: 'Good morning', emoji: '☀️', subtitle: 'A fresh start — make it count.' }
  if (h < 17) return { greeting: 'Good afternoon', emoji: '🚀', subtitle: 'Deep in the zone. Keep the momentum.' }
  if (h < 21) return { greeting: 'Good evening', emoji: '🌆', subtitle: 'Wind down, reflect, plan tomorrow.' }
  return { greeting: 'Good night', emoji: '✨', subtitle: 'Rest well — tomorrow brings new challenges.' }
}

// ── Main Dashboard ──────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { documents } = useDocuments()
  const { cards, columns } = useKanban()

  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [marketData, setMarketData] = useState(FALLBACK_MARKET)
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketLastUpdated, setMarketLastUpdated] = useState(null)

  // Google state
  const [calendarEvents, setCalendarEvents] = useState([])
  const [gmailMessages, setGmailMessages] = useState([])
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState(null)
  const googleToken = getGoogleToken()

  const { greeting, emoji, subtitle } = getGreeting()
  const userName = 'Som'

  // ── Fetch News ─────────────────────────────────

  const fetchNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch(
        'https://newsdata.io/api/1/latest?apikey=pub_67962d0e4e4c217ad3e06d3e8a3d8d80ab757&country=in&language=en&category=business,technology,politics'
      )
      if (!res.ok) throw new Error('News fetch failed')
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const mapped = data.results.slice(0, 6).map((item) => ({
          title: item.title,
          source: item.source_name || item.source_id || 'Unknown',
          time: item.pubDate
            ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })
            : 'recently',
          description: item.description
            ? item.description.slice(0, 120) + (item.description.length > 120 ? '…' : '')
            : '',
          link: item.link || '#',
          image: item.image_url || null,
        }))
        setNews(mapped)
      } else {
        setNews(FALLBACK_NEWS)
      }
    } catch {
      setNews(FALLBACK_NEWS)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  // ── Fetch Markets ──────────────────────────────

  const fetchMarkets = useCallback(async () => {
    setMarketLoading(true)
    try {
      const symbols = [
        { symbol: '%5ENSEI', name: 'Nifty 50' },
        { symbol: '%5EBSESN', name: 'Sensex' },
        { symbol: '%5ENSEBANK', name: 'Bank Nifty' },
        { symbol: 'INR=X', name: 'USD/INR' },
      ]

      const results = await Promise.all(
        symbols.map(async ({ symbol, name }) => {
          try {
            const res = await fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
            )
            if (!res.ok) throw new Error()
            const data = await res.json()
            const meta = data.chart.result[0].meta
            const price = meta.regularMarketPrice
            const prevClose = meta.chartPreviousClose || meta.previousClose
            const changeVal = price - prevClose
            const changePct = ((changeVal / prevClose) * 100).toFixed(2)
            const isUp = changeVal >= 0
            return {
              name,
              value: name === 'USD/INR' ? price.toFixed(2) : price.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
              change: `${isUp ? '+' : ''}${changePct}%`,
              up: isUp,
              sparkData: data.chart.result[0].indicators?.quote?.[0]?.close?.filter(Boolean) || [],
            }
          } catch {
            return null
          }
        })
      )

      const valid = results.filter(Boolean)
      if (valid.length > 0) {
        setMarketData(valid)
        setMarketLastUpdated(new Date())
      }
    } catch {
      // keep fallback
    } finally {
      setMarketLoading(false)
    }
  }, [])

  // ── Fetch Google Data ──────────────────────────

  const fetchGoogleData = useCallback(async () => {
    if (!googleToken) return
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const [calData, gmailData] = await Promise.allSettled([
        fetchCalendarEvents(googleToken),
        fetchGmailMessages(googleToken),
      ])
      if (calData.status === 'fulfilled') {
        setCalendarEvents(calData.value.items || [])
      }
      if (gmailData.status === 'fulfilled') {
        setGmailMessages(gmailData.value || [])
      }
      if (calData.status === 'rejected' && gmailData.status === 'rejected') {
        clearGoogleToken()
        setGoogleError('Session expired. Please reconnect.')
      }
    } catch {
      setGoogleError('Failed to fetch Google data')
    } finally {
      setGoogleLoading(false)
    }
  }, [googleToken])

  // ── Effects ────────────────────────────────────

  useEffect(() => {
    fetchNews()
    fetchMarkets()
  }, [fetchNews, fetchMarkets])

  useEffect(() => {
    fetchGoogleData()
  }, [fetchGoogleData])

  // Auto-refresh markets every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchMarkets])

  // ── Derived data ───────────────────────────────

  const recentDocs = documents.slice(0, 3)
  const dueSoonCards = cards
    .filter((c) => {
      if (!c.due_date) return false
      const col = columns.find((col) => col.id === c.column_id)
      return col?.title !== 'Done'
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 4)

  const totalDocs = documents.length
  const totalTasks = cards.length
  const doneTasks = cards.filter((c) => {
    const col = columns.find((col) => col.id === c.column_id)
    return col?.title === 'Done'
  }).length

  // ── Render ─────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* ── Hero / Welcome ─────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {greeting}, {userName} {emoji}
            </h1>
            <p className="text-slate-400 text-base mt-2 max-w-md">
              {subtitle}
            </p>
          </div>
          <p className="text-slate-500 text-sm font-medium tabular-nums">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={FileText} label="Documents" value={totalDocs} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
          <StatPill icon={ListTodo} label="Open Tasks" value={totalTasks - doneTasks} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/20" />
          <StatPill icon={CheckCircle2} label="Completed" value={doneTasks} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
          <StatPill icon={Sparkles} label="Today" value={format(new Date(), 'MMM d')} color="text-purple-400" bg="bg-purple-500/10 border-purple-500/20" />
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'New Document', icon: FilePlus, action: () => navigate('/documents/new'), gradient: 'from-blue-600/20 to-indigo-600/20', border: 'border-blue-500/30', iconColor: 'text-blue-400' },
          { label: 'New Task', icon: ListTodo, action: () => navigate('/kanban'), gradient: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/30', iconColor: 'text-amber-400' },
          { label: 'Block Time', icon: Clock, action: () => {}, gradient: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
        ].map(({ label, icon: Icon, action, gradient, border, iconColor }) => (
          <button
            key={label}
            onClick={action}
            className={`flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r ${gradient} border ${border} rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:scale-[1.03] hover:shadow-lg hover:shadow-black/20 transition-all duration-200`}
          >
            <Icon className={`w-4 h-4 ${iconColor}`} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Widget Grid — 3 columns on large ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Calendar (1 col) ─────────────────── */}
        <WidgetCard
          title="Calendar"
          icon={Calendar}
          accentColor="blue"
          className="lg:col-span-1"
        >
          <CalendarWidget
            googleToken={googleToken}
            events={calendarEvents}
            loading={googleLoading}
            error={googleError}
          />
        </WidgetCard>

        {/* ── Email (1 col) ────────────────────── */}
        <WidgetCard
          title="Email"
          icon={Mail}
          accentColor="emerald"
          className="lg:col-span-1"
        >
          <EmailWidget
            googleToken={googleToken}
            messages={gmailMessages}
            loading={googleLoading}
            error={googleError}
          />
        </WidgetCard>

        {/* ── Recent Documents (1 col) ─────────── */}
        <WidgetCard
          title="Recent Documents"
          icon={FileText}
          accentColor="indigo"
          className="lg:col-span-1"
        >
          <RecentDocsWidget docs={recentDocs} navigate={navigate} />
        </WidgetCard>

        {/* ── Markets (2 cols) ─────────────────── */}
        <WidgetCard
          title="Markets"
          icon={TrendingUp}
          accentColor="amber"
          className="lg:col-span-2"
          headerRight={
            <div className="flex items-center gap-2">
              {marketLastUpdated && (
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {format(marketLastUpdated, 'HH:mm')}
                </span>
              )}
              <button
                onClick={fetchMarkets}
                disabled={marketLoading}
                className="p-1 rounded-md hover:bg-slate-700/40 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Refresh markets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${marketLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        >
          <MarketsWidget data={marketData} loading={marketLoading} />
        </WidgetCard>

        {/* ── Tasks Due Soon (1 col) ──────────── */}
        <WidgetCard
          title="Tasks Due Soon"
          icon={AlertCircle}
          accentColor="rose"
          className="lg:col-span-1"
        >
          <TasksWidget cards={dueSoonCards} columns={columns} navigate={navigate} />
        </WidgetCard>

        {/* ── News (full width) ────────────────── */}
        <WidgetCard
          title="News"
          icon={Newspaper}
          accentColor="purple"
          className="lg:col-span-3"
          headerRight={
            <button
              onClick={fetchNews}
              disabled={newsLoading}
              className="p-1 rounded-md hover:bg-slate-700/40 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              title="Refresh news"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          <NewsWidget news={news} loading={newsLoading} />
        </WidgetCard>
      </div>
    </div>
  )
}

// ── Stat Pill ────────────────────────────────────────

function StatPill({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur ${bg} transition-all duration-200 hover:scale-[1.02]`}>
      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

// ── Widget Card (reusable) ───────────────────────────

const ACCENT_MAP = {
  blue: { border: 'border-l-blue-500', iconColor: 'text-blue-400', headerGradient: 'from-blue-500/10 to-transparent' },
  emerald: { border: 'border-l-emerald-500', iconColor: 'text-emerald-400', headerGradient: 'from-emerald-500/10 to-transparent' },
  amber: { border: 'border-l-amber-500', iconColor: 'text-amber-400', headerGradient: 'from-amber-500/10 to-transparent' },
  purple: { border: 'border-l-purple-500', iconColor: 'text-purple-400', headerGradient: 'from-purple-500/10 to-transparent' },
  indigo: { border: 'border-l-indigo-500', iconColor: 'text-indigo-400', headerGradient: 'from-indigo-500/10 to-transparent' },
  rose: { border: 'border-l-rose-500', iconColor: 'text-rose-400', headerGradient: 'from-rose-500/10 to-transparent' },
}

function WidgetCard({ title, icon: Icon, accentColor = 'blue', children, className = '', headerRight }) {
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.blue
  return (
    <div
      className={`
        bg-gradient-to-br from-slate-800/60 to-slate-800/30
        backdrop-blur border border-slate-700/40
        border-l-2 ${accent.border}
        rounded-2xl overflow-hidden
        shadow-lg shadow-black/10
        hover:shadow-xl hover:shadow-black/20
        hover:border-slate-600/50
        transition-all duration-300
        ${className}
      `}
    >
      <div className={`flex items-center justify-between gap-2.5 px-5 py-3.5 bg-gradient-to-r ${accent.headerGradient} border-b border-slate-700/30`}>
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${accent.iconColor}`} />
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        {headerRight}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── Calendar Widget ──────────────────────────────────

function CalendarWidget({ googleToken, events, loading, error }) {
  const today = new Date()
  const dayOfMonth = format(today, 'd')
  const monthYear = format(today, 'MMMM yyyy')
  const dayName = format(today, 'EEEE')

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* Today's date display */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-blue-400 leading-none">{dayOfMonth}</span>
          <span className="text-[10px] text-blue-300/70 uppercase font-medium mt-0.5">
            {format(today, 'MMM')}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">{dayName}</p>
          <p className="text-xs text-slate-500">{monthYear}</p>
        </div>
      </div>

      {/* Google Integration */}
      {isGoogleConfigured && googleToken && events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors">
              <div className="w-1 h-full min-h-[20px] rounded-full bg-blue-400 flex-shrink-0 mt-1" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{event.summary}</p>
                <p className="text-[10px] text-slate-500">
                  {event.start?.dateTime ? format(new Date(event.start.dateTime), 'h:mm a') : 'All day'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : isGoogleConfigured && googleToken ? (
        <p className="text-xs text-slate-500 text-center py-2">No events today 🎉</p>
      ) : isGoogleConfigured ? (
        <button
          onClick={initiateGoogleAuth}
          className="w-full px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-medium transition-all hover:scale-[1.02]"
        >
          Connect Google Calendar
        </button>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-slate-500">Google Calendar integration</p>
          <p className="text-[10px] text-slate-600 mt-1">Set VITE_GOOGLE_CLIENT_ID in .env</p>
        </div>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}

// ── Email Widget ─────────────────────────────────────

function EmailWidget({ googleToken, messages, loading, error }) {
  if (loading) return <LoadingSpinner />

  if (isGoogleConfigured && googleToken && messages.length > 0) {
    return (
      <div className="space-y-2">
        {messages.slice(0, 4).map((msg, i) => {
          const subject = msg.payload?.headers?.find((h) => h.name === 'Subject')?.value || 'No subject'
          const from = msg.payload?.headers?.find((h) => h.name === 'From')?.value || ''
          const senderName = from.split('<')[0].trim() || from
          return (
            <div key={i} className="group flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-emerald-400">{senderName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{subject}</p>
                <p className="text-[10px] text-slate-500 truncate">{senderName}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <Mail className="w-7 h-7 text-emerald-400" />
      </div>
      {isGoogleConfigured ? (
        <>
          <p className="text-slate-300 text-sm font-medium mb-1">Gmail Inbox</p>
          <p className="text-slate-500 text-xs mb-4 text-center">See your latest emails at a glance</p>
          {!googleToken ? (
            <button
              onClick={initiateGoogleAuth}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium transition-all hover:scale-[1.02]"
            >
              Connect Gmail
            </button>
          ) : (
            <p className="text-xs text-slate-500">No unread emails</p>
          )}
        </>
      ) : (
        <>
          <p className="text-slate-300 text-sm font-medium mb-1">Gmail Integration</p>
          <p className="text-slate-500 text-xs text-center">Set VITE_GOOGLE_CLIENT_ID in .env to connect</p>
        </>
      )}
      {error && <p className="text-[10px] text-red-400 mt-2">{error}</p>}
    </div>
  )
}

// ── Recent Documents Widget ──────────────────────────

function RecentDocsWidget({ docs, navigate }) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-indigo-400" />
        </div>
        <p className="text-slate-400 text-sm mb-3">No documents yet</p>
        <button
          onClick={() => navigate('/documents/new')}
          className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm font-medium transition-all hover:scale-[1.02]"
        >
          Create your first doc
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <button
          key={doc.id}
          onClick={() => navigate(`/documents/${doc.id}`)}
          className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate transition-colors">
              {doc.title || 'Untitled'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {doc.updated_at
                ? formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })
                : 'Recently'}
            </p>
          </div>
        </button>
      ))}
      {docs?.length >= 3 && (
        <button
          onClick={() => navigate('/documents')}
          className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-2 transition-colors"
        >
          View all documents →
        </button>
      )}
    </div>
  )
}

// ── Markets Widget ───────────────────────────────────

function MarketsWidget({ data, loading }) {
  if (loading && data === FALLBACK_MARKET) return <LoadingSpinner />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-700/20 border border-slate-700/30 hover:bg-slate-700/30 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">{item.name}</p>
            <p className="text-base font-bold text-slate-100 font-mono mt-0.5">{item.value}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                item.up
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-red-400 bg-red-500/15'
              }`}
            >
              {item.up ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {item.change}
            </span>
            {/* Mini sparkline visual */}
            {item.sparkData && item.sparkData.length > 5 && (
              <MiniSparkline data={item.sparkData} up={item.up} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Mini Sparkline ───────────────────────────────────

function MiniSparkline({ data, up }) {
  const points = data.slice(-20) // last 20 data points
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const w = 60
  const h = 20

  const pathData = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((val - min) / range) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="opacity-60">
      <path
        d={pathData}
        fill="none"
        stroke={up ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Tasks Widget ─────────────────────────────────────

function TasksWidget({ cards, columns, navigate }) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-rose-400" />
        </div>
        <p className="text-slate-400 text-sm mb-1">All caught up!</p>
        <p className="text-slate-500 text-xs">No upcoming tasks with due dates</p>
      </div>
    )
  }

  const PRIORITY_COLORS = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => {
        const col = columns.find((c) => c.id === card.column_id)
        return (
          <button
            key={card.id}
            onClick={() => navigate('/kanban')}
            className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors text-left group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate transition-colors">
                {card.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {card.priority && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium}`}>
                    {card.priority}
                  </span>
                )}
                {col && (
                  <span className="text-[10px] text-slate-500">{col.title}</span>
                )}
                {card.due_date && (
                  <span className="text-[10px] text-slate-500">
                    Due {formatDistanceToNow(new Date(card.due_date), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── News Widget ──────────────────────────────────────

function NewsWidget({ news, loading }) {
  if (loading) return <LoadingSpinner />
  if (news.length === 0) return <p className="text-slate-500 text-sm text-center py-4">No news available</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {news.map((item, idx) => (
        <a
          key={idx}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-xl bg-slate-700/20 border border-slate-700/30 overflow-hidden hover:bg-slate-700/40 hover:border-slate-600/50 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.01] transition-all duration-200"
        >
          {/* Thumbnail */}
          {item.image ? (
            <div className="w-full h-32 bg-slate-700/40 overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.classList.add('hidden')
                }}
              />
            </div>
          ) : null}
          <div className="p-4 flex-1 flex flex-col">
            <h4 className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 transition-colors">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 flex-1">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/30">
              <span className="text-[10px] text-slate-500 font-medium">
                {item.source}
              </span>
              <span className="text-[10px] text-slate-600">
                {item.time}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

// ── Loading Spinner ──────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )
}
