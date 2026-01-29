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
  { title: 'Fed signals potential rate cut in September meeting', source: 'Reuters', time: '2h ago', description: 'The Federal Reserve hinted at possible interest rate reductions as inflation shows signs of cooling.', link: 'https://www.reuters.com/business/' },
  { title: 'AI chip demand drives semiconductor stocks higher', source: 'Bloomberg', time: '4h ago', description: 'Nvidia and AMD lead gains as AI infrastructure spending accelerates globally.', link: 'https://www.bloomberg.com/technology' },
  { title: 'India GDP growth exceeds forecasts at 7.8%', source: 'Economic Times', time: '5h ago', description: 'India\'s economy surpasses expectations with robust manufacturing and services growth.', link: 'https://economictimes.indiatimes.com/' },
  { title: 'European markets steady amid geopolitical tensions', source: 'FT', time: '6h ago', description: 'Markets show resilience despite ongoing regional conflicts and supply chain concerns.', link: 'https://www.ft.com/markets' },
  { title: 'RBI holds rates steady, signals cautious optimism', source: 'Mint', time: '7h ago', description: 'Reserve Bank of India maintains repo rate at 6.5%, citing balanced inflation outlook.', link: 'https://www.livemint.com/economy' },
  { title: 'Tech layoffs slow as hiring picks up in AI sector', source: 'TechCrunch', time: '8h ago', description: 'AI-related job postings surge 40% while traditional tech layoffs decline quarter-over-quarter.', link: 'https://techcrunch.com/category/artificial-intelligence/' },
]

// ── Daily quotes ────────────────────────────────────

const DAILY_QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It is not the strongest that survive, nor the most intelligent, but the most responsive to change.', author: 'Charles Darwin' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
  { text: 'To live is the rarest thing in the world. Most people exist, that is all.', author: 'Oscar Wilde' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Know thyself.', author: 'Delphi Oracle' },
  { text: 'Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.', author: 'Jean-Paul Sartre' },
  { text: 'Happiness is not something ready-made. It comes from your own actions.', author: 'Dalai Lama' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.', author: 'Ralph Waldo Emerson' },
  { text: 'What we know is a drop, what we don\'t know is an ocean.', author: 'Isaac Newton' },
  { text: 'A ship in harbor is safe, but that is not what ships are built for.', author: 'John A. Shedd' },
  { text: 'Life can only be understood backwards; but it must be lived forwards.', author: 'Søren Kierkegaard' },
  { text: 'The mind that opens to a new idea never returns to its original size.', author: 'Albert Einstein' },
  { text: 'I think, therefore I am.', author: 'René Descartes' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Knowing is not enough, we must apply. Willing is not enough, we must do.', author: 'Johann Wolfgang von Goethe' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'The world breaks everyone, and afterward, many are strong at the broken places.', author: 'Ernest Hemingway' },
  { text: 'What you seek is seeking you.', author: 'Rumi' },
  { text: 'One must imagine Sisyphus happy.', author: 'Albert Camus' },
  { text: 'Doubt is the origin of wisdom.', author: 'René Descartes' },
  { text: 'An unexamined life is not worth living, but a life unexamined by yourself is not your own.', author: 'Somnath Chakravarty' },
  { text: 'Downshift to discover. Speed gives you distance, but slowing down gives you depth.', author: 'Somnath Chakravarty' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
]

function getDailyQuote() {
  // Deterministic: pick quote based on day of year
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
}

// ── Helper: time-based greeting ─────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return { greeting: 'Burning the midnight oil', emoji: '🌙' }
  if (h < 12) return { greeting: 'Good morning', emoji: '☀️' }
  if (h < 17) return { greeting: 'Good afternoon', emoji: '🚀' }
  if (h < 21) return { greeting: 'Good evening', emoji: '🌆' }
  return { greeting: 'Good night', emoji: '✨' }
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

  const { greeting, emoji } = getGreeting()
  const dailyQuote = getDailyQuote()
  const userName = 'Som'

  // ── Fetch News ─────────────────────────────────

  const fetchNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/latest?apikey=${import.meta.env.VITE_NEWSDATA_API_KEY || ''}&country=in&language=en&category=business,technology,politics`
      )
      if (!res.ok) throw new Error('News fetch failed')
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const seen = new Set()
        const mapped = data.results
          .filter((item) => {
            // Deduplicate by normalised title
            const key = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, 6)
          .map((item) => ({
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

  // ── Render ─────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* ── Hero / Welcome ─────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {greeting}, {userName} {emoji}
            </h1>
            <div className="mt-3 max-w-xl px-4 py-3 bg-gray-100 border-l-4 border-gray-900 rounded-r-xl">
              <p className="text-gray-700 text-base italic font-medium leading-relaxed">
                "{dailyQuote.text}"
              </p>
              <p className="text-gray-400 text-sm mt-1.5 not-italic">— {dailyQuote.author}</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium tabular-nums">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

      </div>

      {/* ── Quick Actions ──────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'New Document', icon: FilePlus, action: () => navigate('/documents/new') },
          { label: 'New Task', icon: ListTodo, action: () => navigate('/kanban') },
          { label: 'Block Time', icon: Clock, action: () => {} },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-black hover:bg-gray-800 rounded-xl text-sm font-medium text-white transition-all duration-200"
          >
            <Icon className="w-4 h-4" />
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
          className="lg:col-span-1"
        >
          <RecentDocsWidget docs={recentDocs} navigate={navigate} />
        </WidgetCard>

        {/* ── Markets (2 cols) ─────────────────── */}
        <WidgetCard
          title="Markets"
          icon={TrendingUp}
          className="lg:col-span-2"
          headerRight={
            <div className="flex items-center gap-2">
              {marketLastUpdated && (
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {format(marketLastUpdated, 'HH:mm')}
                </span>
              )}
              <button
                onClick={fetchMarkets}
                disabled={marketLoading}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
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
          className="lg:col-span-1"
        >
          <TasksWidget cards={dueSoonCards} columns={columns} navigate={navigate} />
        </WidgetCard>

        {/* ── News (full width) ────────────────── */}
        <WidgetCard
          title="News"
          icon={Newspaper}
          className="lg:col-span-3"
          headerRight={
            <button
              onClick={fetchNews}
              disabled={newsLoading}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
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

// ── Widget Card (reusable) ───────────────────────────

function WidgetCard({ title, icon: Icon, children, className = '', headerRight }) {
  return (
    <div
      className={`
        bg-white
        border border-gray-200
        rounded-2xl overflow-hidden
        shadow-sm
        hover:shadow-md
        transition-all duration-300
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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
        <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-gray-900 leading-none">{dayOfMonth}</span>
          <span className="text-[10px] text-gray-500 uppercase font-medium mt-0.5">
            {format(today, 'MMM')}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{dayName}</p>
          <p className="text-xs text-gray-400">{monthYear}</p>
        </div>
      </div>

      {/* Google Integration */}
      {isGoogleConfigured && googleToken && events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event, i) => (
            <a
              key={i}
              href={event.htmlLink || `https://calendar.google.com/calendar/r/event/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-1 h-full min-h-[20px] rounded-full bg-gray-400 flex-shrink-0 mt-1" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{event.summary}</p>
                <p className="text-[10px] text-gray-400">
                  {event.start?.dateTime ? format(new Date(event.start.dateTime), 'h:mm a') : 'All day'}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : isGoogleConfigured && googleToken ? (
        <p className="text-xs text-gray-400 text-center py-2">No events today 🎉</p>
      ) : isGoogleConfigured ? (
        <button
          onClick={initiateGoogleAuth}
          className="w-full px-4 py-2.5 bg-black hover:bg-gray-800 rounded-xl text-white text-sm font-medium transition-all"
        >
          Connect Google Calendar
        </button>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">Google Calendar integration</p>
          <p className="text-[10px] text-gray-400 mt-1">Set VITE_GOOGLE_CLIENT_ID in .env</p>
        </div>
      )}
      {error && <p className="text-[10px] text-red-500">{error}</p>}
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
            <a
              key={i}
              href={`https://mail.google.com/mail/u/0/#inbox/${msg.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-gray-600">{senderName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-800 truncate">{subject}</p>
                <p className="text-[10px] text-gray-400 truncate">{senderName}</p>
              </div>
            </a>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
        <Mail className="w-7 h-7 text-gray-400" />
      </div>
      {isGoogleConfigured ? (
        <>
          <p className="text-gray-700 text-sm font-medium mb-1">Gmail Inbox</p>
          <p className="text-gray-400 text-xs mb-4 text-center">See your latest emails at a glance</p>
          {!googleToken ? (
            <button
              onClick={initiateGoogleAuth}
              className="px-4 py-2.5 bg-black hover:bg-gray-800 rounded-xl text-white text-sm font-medium transition-all"
            >
              Connect Gmail
            </button>
          ) : (
            <p className="text-xs text-gray-400">No unread emails</p>
          )}
        </>
      ) : (
        <>
          <p className="text-gray-700 text-sm font-medium mb-1">Gmail Integration</p>
          <p className="text-gray-400 text-xs text-center">Set VITE_GOOGLE_CLIENT_ID in .env to connect</p>
        </>
      )}
      {error && <p className="text-[10px] text-red-500 mt-2">{error}</p>}
    </div>
  )
}

// ── Recent Documents Widget ──────────────────────────

function RecentDocsWidget({ docs, navigate }) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm mb-3">No documents yet</p>
        <button
          onClick={() => navigate('/documents/new')}
          className="px-4 py-2 bg-black hover:bg-gray-800 rounded-xl text-white text-sm font-medium transition-all"
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
          className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate transition-colors">
              {doc.title || 'Untitled'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
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
          className="w-full text-center text-xs text-gray-600 hover:text-gray-900 py-2 transition-colors"
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
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">{item.name}</p>
            <p className="text-base font-bold text-gray-900 font-mono mt-0.5">{item.value}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                item.up
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-red-600 bg-red-50'
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
        stroke={up ? '#059669' : '#dc2626'}
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
        <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm mb-1">All caught up!</p>
        <p className="text-gray-400 text-xs">No upcoming tasks with due dates</p>
      </div>
    )
  }

  const PRIORITY_COLORS = {
    high: 'bg-gray-100 text-gray-700 border-gray-300',
    medium: 'bg-gray-50 text-gray-600 border-gray-200',
    low: 'bg-gray-50 text-gray-500 border-gray-200',
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => {
        const col = columns.find((c) => c.id === card.column_id)
        return (
          <button
            key={card.id}
            onClick={() => navigate('/kanban')}
            className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate transition-colors">
                {card.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {card.priority && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium}`}>
                    {card.priority}
                  </span>
                )}
                {col && (
                  <span className="text-[10px] text-gray-400">{col.title}</span>
                )}
                {card.due_date && (
                  <span className="text-[10px] text-gray-400">
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
  if (news.length === 0) return <p className="text-gray-400 text-sm text-center py-4">No news available</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {news.map((item, idx) => (
        <a
          key={idx}
          href={item.link && item.link !== '#' ? item.link : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!item.link || item.link === '#') e.preventDefault() }}
          className="group flex flex-col rounded-xl bg-white border border-gray-200 overflow-hidden hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
        >
          {/* Thumbnail */}
          {item.image ? (
            <div className="w-full h-32 bg-gray-100 overflow-hidden">
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
            <h4 className="text-sm font-medium text-gray-900 group-hover:text-black line-clamp-2 transition-colors">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 flex-1">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <span className="text-[10px] text-gray-500 font-medium">
                {item.source}
              </span>
              <span className="text-[10px] text-gray-400">
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
      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  )
}
