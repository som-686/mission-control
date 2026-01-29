import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
} from 'lucide-react'

const marketData = [
  { name: 'Nifty 50', value: '24,857.30', change: '+1.2%', up: true },
  { name: 'Sensex', value: '81,523.16', change: '+0.9%', up: true },
  { name: 'Bank Nifty', value: '52,140.75', change: '-0.3%', up: false },
  { name: 'USD/INR', value: '83.42', change: '+0.1%', up: true },
]

const newsHeadlines = [
  { title: 'Fed signals potential rate cut in September meeting', source: 'Reuters', time: '2h ago' },
  { title: 'AI chip demand drives semiconductor stocks higher', source: 'Bloomberg', time: '4h ago' },
  { title: 'India GDP growth exceeds forecasts at 7.8%', source: 'Economic Times', time: '5h ago' },
  { title: 'European markets steady amid geopolitical tensions', source: 'FT', time: '6h ago' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {greeting} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here's your command center overview
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'New Document', icon: FilePlus, action: () => navigate('/documents/new') },
          { label: 'New Task', icon: ListTodo, action: () => navigate('/kanban') },
          { label: 'Block Time', icon: Clock, action: () => {} },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50 rounded-xl text-sm text-slate-300 hover:text-white transition-all duration-150"
          >
            <Icon className="w-4 h-4 text-indigo-400" />
            {label}
          </button>
        ))}
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calendar Widget */}
        <WidgetCard
          title="Calendar"
          icon={Calendar}
          iconColor="text-blue-400"
        >
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-slate-300 text-sm font-medium mb-1">Google Calendar</p>
            <p className="text-slate-500 text-xs mb-4">See your schedule at a glance</p>
            <button className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm font-medium transition-all">
              Connect Google Calendar
            </button>
          </div>
        </WidgetCard>

        {/* Email Widget */}
        <WidgetCard
          title="Email"
          icon={Mail}
          iconColor="text-emerald-400"
        >
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-slate-300 text-sm font-medium mb-1">Gmail Inbox</p>
            <p className="text-slate-500 text-xs mb-4">Critical emails and action items</p>
            <button className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm font-medium transition-all">
              Connect Gmail
            </button>
          </div>
        </WidgetCard>

        {/* Market Widget */}
        <WidgetCard
          title="Markets"
          icon={TrendingUp}
          iconColor="text-amber-400"
        >
          <div className="space-y-3">
            {marketData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-2 px-1"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-sm font-mono text-slate-300">{item.value}</span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-md ${
                      item.up
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-red-400 bg-red-500/10'
                    }`}
                  >
                    {item.up ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* News Widget */}
        <WidgetCard
          title="News"
          icon={Newspaper}
          iconColor="text-purple-400"
        >
          <div className="space-y-1">
            {newsHeadlines.map((item, idx) => (
              <div
                key={idx}
                className="group flex items-start gap-3 py-2.5 px-1 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.source} · {item.time}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 mt-0.5 flex-shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  )
}

function WidgetCard({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-slate-800/40 backdrop-blur border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-700/30">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
