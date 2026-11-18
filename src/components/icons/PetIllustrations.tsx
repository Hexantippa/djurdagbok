import React from 'react';
import {
  Stethoscope,
  Scale,
  Utensils,
  Bandage,
  Droplets,
  Pill,
  Scissors,
  Sparkles,
  Heart,
  FileText,
  Home,
  PawPrint,
  Calendar,
  Tag,
} from 'lucide-react';
import { CategoryIconKey } from '../../types/models';

export const CATEGORY_ICON_OPTIONS: { key: CategoryIconKey; label: string }[] = [
  { key: 'stethoscope', label: 'Veterinär' },
  { key: 'scale', label: 'Vikt' },
  { key: 'utensils', label: 'Foder' },
  { key: 'bandage', label: 'Skada / symptom' },
  { key: 'droplets', label: 'Urin & avföring' },
  { key: 'pill', label: 'Medicin' },
  { key: 'scissors', label: 'Hemvård' },
  { key: 'sparkles', label: 'Övrigt' },
  { key: 'heart', label: 'Hälsa' },
  { key: 'file-text', label: 'Anteckning' },
  { key: 'home', label: 'Hem' },
  { key: 'paw', label: 'Tass' },
  { key: 'calendar', label: 'Datum' },
  { key: 'tag', label: 'Etikett' },
];

export const CATEGORY_COLOR_PALETTE: string[] = [
  '#FBAE44', // Klar bärnsten
  '#45B87A', // Klar smaragd/salvia
  '#6EC43F', // Lövgrön
  '#E85D4A', // Tydlig korallröd
  '#3D9BD6', // Klarblå
  '#A974E0', // Tydlig violett
  '#D4A238', // Varm guld
  '#38A89D', // Klar turkos
  '#9098A3', // Tydlig skiffergrå
];

export function CategoryIcon({
  icon,
  size = 18,
  className = '',
  style,
}: {
  icon: CategoryIconKey;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const props = { size, className, style, 'aria-hidden': true as const };
  switch (icon) {
    case 'stethoscope':
      return <Stethoscope {...props} />;
    case 'scale':
      return <Scale {...props} />;
    case 'utensils':
      return <Utensils {...props} />;
    case 'bandage':
      return <Bandage {...props} />;
    case 'droplets':
      return <Droplets {...props} />;
    case 'pill':
      return <Pill {...props} />;
    case 'scissors':
      return <Scissors {...props} />;
    case 'sparkles':
      return <Sparkles {...props} />;
    case 'heart':
      return <Heart {...props} />;
    case 'file-text':
      return <FileText {...props} />;
    case 'home':
      return <Home {...props} />;
    case 'paw':
      return <PawPrint {...props} />;
    case 'calendar':
      return <Calendar {...props} />;
    case 'tag':
    default:
      return <Tag {...props} />;
  }
}

/** Stiliserad kattillustration för kattprofil (MVP) */
export function StylizedCatIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="var(--bg-surface-elevated)" />
      {/* Öron */}
      <path
        d="M17 28L15 12L27 20"
        fill="var(--palette-amber)"
        fillOpacity="0.22"
        stroke="var(--accent-primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 28L49 12L37 20"
        fill="var(--palette-amber)"
        fillOpacity="0.22"
        stroke="var(--accent-primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Huvud */}
      <path
        d="M16 32C16 23.5 23 18 32 18C41 18 48 23.5 48 32C48 41.5 41 48 32 48C23 48 16 41.5 16 32Z"
        fill="var(--bg-surface)"
        stroke="var(--accent-primary)"
        strokeWidth="2.2"
      />
      {/* Panna ränder (Bengal-hint) */}
      <path
        d="M28 22V25M32 21V25M36 22V25"
        stroke="var(--accent-secondary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Ögon */}
      <circle cx="25.5" cy="31.5" r="2.3" fill="var(--text-primary)" />
      <circle cx="38.5" cy="31.5" r="2.3" fill="var(--text-primary)" />
      <circle cx="26.2" cy="30.8" r="0.7" fill="var(--bg-surface)" />
      <circle cx="39.2" cy="30.8" r="0.7" fill="var(--bg-surface)" />
      {/* Nos & mun */}
      <path
        d="M30 36.5H34L32 39L30 36.5Z"
        fill="var(--accent-primary)"
      />
      <path
        d="M32 39C32 41 29.5 42 28 41M32 39C32 41 34.5 42 36 41"
        stroke="var(--text-primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Morrhår */}
      <path
        d="M12 34L20 35M12 38L20 38M52 34L44 35M52 38L44 38"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Tassillustration för ny profil / okänd profilbild (MVP) */
export function StylizedPawIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="var(--bg-surface-elevated)" />
      <ellipse cx="20" cy="25" rx="4" ry="5.5" transform="rotate(-15 20 25)" fill="var(--accent-primary)" />
      <ellipse cx="28" cy="19.5" rx="3.8" ry="5.5" transform="rotate(-4 28 19.5)" fill="var(--accent-primary)" />
      <ellipse cx="36.5" cy="19.5" rx="3.8" ry="5.5" transform="rotate(4 36.5 19.5)" fill="var(--accent-primary)" />
      <ellipse cx="44" cy="25" rx="4" ry="5.5" transform="rotate(15 44 25)" fill="var(--accent-primary)" />
      <path
        d="M22 39C22 33.5 26.5 29.5 32 29.5C37.5 29.5 42 33.5 42 39C42 43.2 38.5 45.5 35 44.8C33.2 44.4 30.8 44.4 29 44.8C25.5 45.5 22 43.2 22 39Z"
        fill="var(--accent-primary)"
      />
    </svg>
  );
}

/** Tidslinje-ikon med vertikal linje och öppna cirklar enligt skiss */
export function TimelineIcon({
  size = 18,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="1.2" x2="12" y2="4.3" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="3.1" stroke="currentColor" strokeWidth="2.1" />
      <line x1="12" y1="10.6" x2="12" y2="13.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="3.1" stroke="currentColor" strokeWidth="2.1" />
      <line x1="12" y1="19.6" x2="12" y2="22.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/** Gullig gruppillustration i samma stil som profilikonen: katt, ödla, orm, kackerlacka, syrsa och gråsuggor */
export function CutePetsGroupIllustration({
  className = 'w-full max-w-[360px] h-auto',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Illustration med katt, ödla, orm, kackerlacka, syrsa och gråsuggor"
    >
      {/* Mjuk bakgrundsoval & mark */}
      <ellipse cx="160" cy="112" rx="142" ry="96" fill="var(--bg-surface-elevated)" />
      <ellipse cx="160" cy="176" rx="116" ry="18" fill="var(--palette-sage)" fillOpacity="0.22" />

      {/* 1. SYRSA (uppe till höger) */}
      <g>
        {/* Antenner */}
        <path
          d="M214 58C207 46 196 42 186 44"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M220 57C217 44 211 36 202 34"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Hoppben bak */}
        <path
          d="M239 74L255 54L265 78"
          stroke="var(--accent-primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Små framben */}
        <path
          d="M224 80L220 88M232 80L232 88"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Kropp */}
        <ellipse
          cx="236"
          cy="72"
          rx="16"
          ry="9"
          transform="rotate(-10 236 72)"
          fill="var(--palette-sage)"
          stroke="var(--accent-primary)"
          strokeWidth="2.1"
        />
        {/* Huvud */}
        <circle
          cx="217"
          cy="68"
          r="9"
          fill="var(--palette-sage)"
          stroke="var(--accent-primary)"
          strokeWidth="2.1"
        />
        {/* Ögon */}
        <circle cx="213.5" cy="66.5" r="2" fill="var(--text-primary)" />
        <circle cx="214" cy="65.8" r="0.65" fill="var(--bg-surface)" />
        <path
          d="M212 71.5C214 73 217 73 218.5 71.5"
          stroke="var(--text-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* 2. KACKERLACKA (mitten till höger) */}
      <g>
        {/* Ben */}
        <path
          d="M238 117L228 112M236 125L226 126M238 133L229 138"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M270 117L280 112M272 125L282 126M270 133L279 138"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Sköld/kropp */}
        <ellipse
          cx="254"
          cy="126"
          rx="18"
          ry="21"
          fill="var(--palette-amber)"
          fillOpacity="0.34"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Segment & vinglinje */}
        <path
          d="M238 122C246 118 262 118 270 122"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M254 120V145"
          stroke="var(--accent-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Huvud */}
        <path
          d="M243 108C243 101 248 97 254 97C260 97 265 101 265 108"
          fill="var(--bg-surface)"
          stroke="var(--accent-primary)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Antenner */}
        <path
          d="M248 99C242 90 232 88 225 91"
          stroke="var(--accent-primary)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M260 99C266 90 276 88 283 91"
          stroke="var(--accent-primary)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Gulliga ögon */}
        <circle cx="249" cy="105" r="2" fill="var(--text-primary)" />
        <circle cx="259" cy="105" r="2" fill="var(--text-primary)" />
        <circle cx="249.6" cy="104.3" r="0.65" fill="var(--bg-surface)" />
        <circle cx="259.6" cy="104.3" r="0.65" fill="var(--bg-surface)" />
      </g>

      {/* 3. ÖDLA (mitten/uppe till vänster) */}
      <g>
        {/* Svans */}
        <path
          d="M57 104C40 100 32 84 42 74C49 67 57 73 53 81"
          stroke="var(--accent-primary)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M57 104C40 100 32 84 42 74C49 67 57 73 53 81"
          stroke="var(--palette-sage)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Ben + tår */}
        <path
          d="M66 112L58 122M58 122L54 124M58 122L60 125"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M89 108L92 119M92 119L89 122M92 119L95 121"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Kropp */}
        <ellipse
          cx="76"
          cy="102"
          rx="20"
          ry="11"
          transform="rotate(-14 76 102)"
          fill="var(--palette-sage)"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Prickar på ryggen */}
        <circle cx="68" cy="103" r="2.2" fill="var(--palette-amber)" />
        <circle cx="77" cy="100" r="2.2" fill="var(--palette-amber)" />
        {/* Huvud */}
        <ellipse
          cx="96"
          cy="90"
          rx="13"
          ry="10.5"
          transform="rotate(8 96 90)"
          fill="var(--palette-sage)"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Ögon & leende */}
        <circle cx="94" cy="87" r="2.4" fill="var(--text-primary)" />
        <circle cx="102" cy="88" r="2.1" fill="var(--text-primary)" />
        <circle cx="94.7" cy="86.3" r="0.8" fill="var(--bg-surface)" />
        <circle cx="102.6" cy="87.3" r="0.7" fill="var(--bg-surface)" />
        <path
          d="M93 95C96 97 101 97 104 95"
          stroke="var(--text-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* 4. KATT (mitten — samma stil som StylizedCatIllustration) */}
      <g>
        {/* Svans */}
        <path
          d="M178 134C194 134 202 121 196 111"
          stroke="var(--accent-primary)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M178 134C194 134 202 121 196 111"
          stroke="var(--bg-surface)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Kropp */}
        <path
          d="M137 104C133 119 134 138 143 141H175C184 138 185 119 181 104"
          fill="var(--bg-surface)"
          stroke="var(--accent-primary)"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        {/* Tassmarkering */}
        <path
          d="M150 141V133M168 141V133"
          stroke="var(--accent-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Öron */}
        <path
          d="M136 74L133 50L151 63"
          fill="var(--palette-amber)"
          fillOpacity="0.28"
          stroke="var(--accent-primary)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M182 74L185 50L167 63"
          fill="var(--palette-amber)"
          fillOpacity="0.28"
          stroke="var(--accent-primary)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Huvud */}
        <path
          d="M134 80C134 67.5 145 59 159 59C173 59 184 67.5 184 80C184 94 173 104 159 104C145 104 134 94 134 80Z"
          fill="var(--bg-surface)"
          stroke="var(--accent-primary)"
          strokeWidth="2.3"
        />
        {/* Pannränder */}
        <path
          d="M153 65V70M159 64V70M165 65V70"
          stroke="var(--accent-secondary)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Ögon */}
        <circle cx="149" cy="79.5" r="3" fill="var(--text-primary)" />
        <circle cx="169" cy="79.5" r="3" fill="var(--text-primary)" />
        <circle cx="150" cy="78.5" r="0.95" fill="var(--bg-surface)" />
        <circle cx="170" cy="78.5" r="0.95" fill="var(--bg-surface)" />
        {/* Nos & mun */}
        <path d="M156 87H162L159 90.5L156 87Z" fill="var(--accent-primary)" />
        <path
          d="M159 90.5C159 93.2 155.5 94.5 153.5 93M159 90.5C159 93.2 162.5 94.5 164.5 93"
          stroke="var(--text-primary)"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {/* Morrhår */}
        <path
          d="M126 83L138 84.5M126 89L138 89M192 83L180 84.5M192 89L180 89"
          stroke="var(--text-muted)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </g>

      {/* 5. ORM (nere till vänster, ringlad och gullig) */}
      <g>
        {/* Yttre ringling */}
        <ellipse
          cx="96"
          cy="176"
          rx="34"
          ry="12"
          fill="var(--palette-amber)"
          fillOpacity="0.26"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Inre ringling */}
        <ellipse
          cx="96"
          cy="167"
          rx="24"
          ry="9"
          fill="var(--bg-surface)"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Fläckar */}
        <circle cx="74" cy="177" r="2.3" fill="var(--accent-primary)" fillOpacity="0.55" />
        <circle cx="116" cy="176" r="2.3" fill="var(--accent-primary)" fillOpacity="0.55" />
        {/* Hals & huvud */}
        <path
          d="M107 162C109 152 104 146 95 146"
          stroke="var(--accent-primary)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M107 162C109 152 104 146 95 146"
          stroke="var(--bg-surface)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse
          cx="88"
          cy="146"
          rx="13.5"
          ry="10"
          fill="var(--bg-surface)"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
        />
        {/* Liten kluven tunga */}
        <path
          d="M74.5 149L69 151M69 151L66 149.5M69 151L66.5 153.5"
          stroke="var(--palette-amber)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Ögon */}
        <circle cx="83" cy="144" r="2.2" fill="var(--text-primary)" />
        <circle cx="91" cy="144" r="2.2" fill="var(--text-primary)" />
        <circle cx="83.6" cy="143.3" r="0.7" fill="var(--bg-surface)" />
        <circle cx="91.6" cy="143.3" r="0.7" fill="var(--bg-surface)" />
      </g>

      {/* 6. GRÅSUGGOR (nere till höger: en större och en liten) */}
      <g>
        {/* Större gråsugga */}
        <g>
          {/* Små ben */}
          <path
            d="M196 184V189M203 185V190M210 185V190M217 185V190M224 184V189"
            stroke="var(--accent-primary)"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          {/* Antenner */}
          <path
            d="M192 177C188 174 185 175 184 177M194 175C192 171 189 170 187 171"
            stroke="var(--accent-primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Skal */}
          <path
            d="M191 182C191 170 201 163 213 163C225 163 233 170 233 182Z"
            fill="var(--bg-surface)"
            stroke="var(--accent-primary)"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          {/* Segmentrader */}
          <path
            d="M204 165V182M212 163.5V182M220 165V182"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
          {/* Öga */}
          <circle cx="197" cy="175" r="1.8" fill="var(--text-primary)" />
          <circle cx="197.5" cy="174.4" r="0.6" fill="var(--bg-surface)" />
        </g>

        {/* Liten gråsugga */}
        <g>
          <path
            d="M245 186V190M251 186V190M257 186V190M263 186V190"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M242 181C239 178 237 179 236 181"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M241 185C241 176 248 171 256 171C264 171 270 176 270 185Z"
            fill="var(--palette-sage)"
            fillOpacity="0.45"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M250 172.5V185M257 171.5V185M263 173V185"
            stroke="var(--accent-primary)"
            strokeWidth="1.3"
            strokeOpacity="0.65"
          />
          <circle cx="246" cy="180" r="1.5" fill="var(--text-primary)" />
          <circle cx="246.4" cy="179.5" r="0.5" fill="var(--bg-surface)" />
        </g>
      </g>
    </svg>
  );
}

