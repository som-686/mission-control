// Monochrome line-art illustrations for page headers

export function DashboardIllust({ className = '' }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="100" cy="80" r="65" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      <circle cx="100" cy="80" r="45" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      {/* Chair */}
      <path d="M82 128 Q82 114 95 110 L115 110 Q128 114 128 128" stroke="#1A1D21" strokeWidth="1.2" fill="none"/>
      <line x1="90" y1="128" x2="87" y2="148" stroke="#1A1D21" strokeWidth="1.2"/>
      <line x1="120" y1="128" x2="123" y2="148" stroke="#1A1D21" strokeWidth="1.2"/>
      {/* Body */}
      <rect x="92" y="80" rx="3" width="26" height="30" fill="#1A1D21"/>
      {/* Head */}
      <circle cx="105" cy="66" r="11" fill="none" stroke="#1A1D21" strokeWidth="1.2"/>
      <path d="M94 63 Q97 53 105 51 Q113 53 116 63" stroke="#1A1D21" strokeWidth="1.5" fill="#1A1D21"/>
      {/* Glasses */}
      <circle cx="101" cy="67" r="3.5" fill="none" stroke="#1A1D21" strokeWidth="0.8"/>
      <circle cx="109" cy="67" r="3.5" fill="none" stroke="#1A1D21" strokeWidth="0.8"/>
      <line x1="104.5" y1="67" x2="105.5" y2="67" stroke="#1A1D21" strokeWidth="0.6"/>
      {/* Laptop */}
      <rect x="62" y="100" rx="2" width="42" height="26" fill="none" stroke="#1A1D21" strokeWidth="1.2"/>
      <rect x="65" y="103" rx="1" width="36" height="18" fill="#F3F4F6"/>
      <line x1="69" y1="108" x2="90" y2="108" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="69" y1="113" x2="95" y2="113" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="69" y1="117" x2="88" y2="117" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M58 126 L108 126" stroke="#1A1D21" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Arms */}
      <path d="M93 90 Q78 97 75 105" stroke="#1A1D21" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M117 90 Q130 97 130 105" stroke="#1A1D21" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Floating checkboxes */}
      <rect x="35" y="48" rx="2" width="14" height="14" fill="none" stroke="#1A1D21" strokeWidth="1"/>
      <polyline points="38,55 41,58 46,52" stroke="#1A1D21" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="150" y="42" rx="2" width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="0.8"/>
      <polyline points="153,48 155,50 159,45" stroke="#9CA3AF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="155" y="88" rx="2" width="10" height="10" fill="none" stroke="#D1D5DB" strokeWidth="0.8"/>
      {/* Chart card */}
      <rect x="140" y="60" rx="4" width="38" height="24" fill="none" stroke="#1A1D21" strokeWidth="0.8"/>
      <polyline points="146,77 151,72 156,75 162,67 170,70" stroke="#1A1D21" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots */}
      <circle cx="52" cy="78" r="2" fill="#D1D5DB"/>
      <circle cx="160" cy="110" r="1.5" fill="#D1D5DB"/>
    </svg>
  )
}

export function KanbanIllust({ className = '' }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Arcs */}
      <path d="M100 130 A 60 60 0 0 1 40 70" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      <path d="M100 130 A 45 45 0 0 1 55 85" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      {/* Three columns */}
      <rect x="15" y="15" rx="4" width="45" height="95" fill="none" stroke="#D1D5DB" strokeWidth="0.8" strokeDasharray="3 2"/>
      <rect x="72" y="15" rx="4" width="45" height="95" fill="none" stroke="#D1D5DB" strokeWidth="0.8" strokeDasharray="3 2"/>
      <rect x="129" y="15" rx="4" width="45" height="95" fill="none" stroke="#D1D5DB" strokeWidth="0.8" strokeDasharray="3 2"/>
      {/* Cards */}
      <rect x="21" y="24" rx="3" width="34" height="22" fill="white" stroke="#1A1D21" strokeWidth="1"/>
      <line x1="25" y1="31" x2="46" y2="31" stroke="#1A1D21" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="25" y1="37" x2="40" y2="37" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      <rect x="21" y="52" rx="3" width="34" height="18" fill="white" stroke="#9CA3AF" strokeWidth="0.8"/>
      <line x1="25" y1="59" x2="42" y2="59" stroke="#9CA3AF" strokeWidth="0.8" strokeLinecap="round"/>
      <rect x="78" y="24" rx="3" width="34" height="20" fill="#1A1D21"/>
      <line x1="82" y1="31" x2="103" y2="31" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="82" y1="37" x2="98" y2="37" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeLinecap="round"/>
      <rect x="135" y="24" rx="3" width="34" height="18" fill="white" stroke="#D1D5DB" strokeWidth="0.8"/>
      <line x1="139" y1="31" x2="160" y2="31" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      {/* Card being dragged */}
      <g transform="translate(112, 5) rotate(-8)">
        <rect rx="3" width="30" height="18" fill="white" stroke="#1A1D21" strokeWidth="1.2"/>
        <line x1="4" y1="7" x2="22" y2="7" stroke="#1A1D21" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="4" y1="12" x2="18" y2="12" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      </g>
      {/* Dashed drag path */}
      <path d="M110 38 Q120 32 128 24" stroke="#1A1D21" strokeWidth="0.8" fill="none" strokeDasharray="2.5 2"/>
      {/* Arrows */}
      <path d="M57 58 L70 58" stroke="#1A1D21" strokeWidth="1" strokeLinecap="round"/>
      <path d="M67 55 L71 58 L67 61" stroke="#1A1D21" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M114 58 L127 58" stroke="#9CA3AF" strokeWidth="0.8" strokeLinecap="round"/>
      {/* Checkmark */}
      <circle cx="152" cy="78" r="8" fill="none" stroke="#1A1D21" strokeWidth="1"/>
      <polyline points="147,78 150,81 157,74" stroke="#1A1D21" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots */}
      <circle cx="12" cy="125" r="1.5" fill="#D1D5DB"/>
      <circle cx="185" cy="12" r="2" fill="#D1D5DB"/>
    </svg>
  )
}

export function DocumentsIllust({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Circles */}
      <circle cx="90" cy="75" r="55" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      <circle cx="90" cy="75" r="38" stroke="#E5E7EB" strokeWidth="1" fill="none"/>
      {/* Stack of pages */}
      <rect x="55" y="30" rx="3" width="65" height="85" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="0.8" transform="rotate(3, 87, 72)"/>
      <rect x="52" y="27" rx="3" width="65" height="85" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="0.8" transform="rotate(-1.5, 84, 69)"/>
      <rect x="48" y="24" rx="3" width="65" height="85" fill="white" stroke="#1A1D21" strokeWidth="1.2"/>
      {/* Content lines */}
      <rect x="57" y="35" rx="1" width="38" height="3.5" fill="#1A1D21"/>
      <rect x="57" y="44" rx="1" width="48" height="2" fill="#D1D5DB"/>
      <rect x="57" y="50" rx="1" width="44" height="2" fill="#D1D5DB"/>
      <rect x="57" y="56" rx="1" width="46" height="2" fill="#D1D5DB"/>
      <rect x="57" y="62" rx="1" width="36" height="2" fill="#D1D5DB"/>
      <rect x="57" y="72" rx="1" width="28" height="3" fill="#1A1D21"/>
      <rect x="57" y="80" rx="1" width="48" height="2" fill="#D1D5DB"/>
      <rect x="57" y="86" rx="1" width="40" height="2" fill="#D1D5DB"/>
      {/* Tags */}
      <rect x="57" y="95" rx="6" width="18" height="7" fill="#1A1D21"/>
      <rect x="78" y="95" rx="6" width="14" height="7" fill="#9CA3AF"/>
      {/* Pen */}
      <line x1="120" y1="58" x2="110" y2="78" stroke="#1A1D21" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="109" cy="80" r="1.5" fill="#1A1D21"/>
      <path d="M122 54 Q128 48 132 52 Q134 56 124 62 L120 58" fill="none" stroke="#1A1D21" strokeWidth="1.2"/>
      {/* Lightbulb */}
      <circle cx="152" cy="28" r="9" fill="none" stroke="#1A1D21" strokeWidth="1"/>
      <path d="M147 25 Q149 19 152 18 Q155 19 157 25" stroke="#1A1D21" strokeWidth="0.8" fill="none"/>
      <line x1="152" y1="37" x2="152" y2="41" stroke="#1A1D21" strokeWidth="1" strokeLinecap="round"/>
      <line x1="149" y1="39" x2="155" y2="39" stroke="#1A1D21" strokeWidth="0.6" strokeLinecap="round"/>
      {/* Rays */}
      <line x1="152" y1="14" x2="152" y2="10" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="163" y1="20" x2="167" y2="16" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="141" y1="20" x2="137" y2="16" stroke="#D1D5DB" strokeWidth="0.8" strokeLinecap="round"/>
      {/* Search */}
      <circle cx="28" cy="50" r="7" fill="none" stroke="#9CA3AF" strokeWidth="1"/>
      <line x1="33" y1="55" x2="38" y2="60" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Plant */}
      <rect x="155" y="105" width="9" height="13" rx="2" fill="none" stroke="#1A1D21" strokeWidth="1"/>
      <path d="M159.5 105 Q159.5 96 155 90" stroke="#1A1D21" strokeWidth="1" fill="none"/>
      <path d="M159.5 100 Q159.5 93 165 88" stroke="#1A1D21" strokeWidth="1" fill="none"/>
      {/* Dots */}
      <circle cx="22" cy="100" r="2" fill="#D1D5DB"/>
      <circle cx="175" cy="65" r="1.5" fill="#D1D5DB"/>
    </svg>
  )
}
