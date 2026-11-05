/** Static artwork; only its outer layers move, with no animation loop in JavaScript. */
export function WaterBackground({ contained = false }: { contained?: boolean }) {
  const light = contained ? 'water-light-recording' : 'water-light-app';
  return <div aria-hidden="true" className={`water-background${contained ? ' water-background--contained' : ''}`}>
    <div className="water-wash" />
    <svg className="water-current" viewBox="0 0 1200 1200" fill="none" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={light} x1="170" y1="60" x2="1050" y2="1130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e9c7e1" stopOpacity=".5"/>
          <stop offset=".42" stopColor="#b5b5e0" stopOpacity=".3"/>
          <stop offset=".76" stopColor="#aed4dc" stopOpacity=".55"/>
          <stop offset="1" stopColor="#d6a5c4" stopOpacity=".2"/>
        </linearGradient>
      </defs>
      <g stroke={`url(#${light})`}>
        <g className="water-bloom" strokeWidth="48" opacity=".19">
          <path d="M-180 520C80 160 310 730 580 420S970 180 1380 320"/>
          <path d="M-140 1040C160 1220 270 690 650 830S1010 1190 1360 790"/>
        </g>
        <g className="water-filaments" strokeWidth="2" opacity=".4">
          <path d="M-180 520C80 160 310 730 580 420S970 180 1380 320"/>
          <path d="M-180 546C90 220 300 758 596 444S990 220 1380 352"/>
          <path d="M-140 1040C160 1220 270 690 650 830S1010 1190 1360 790"/>
          <path d="M-140 1014C148 1180 280 660 658 800S1030 1150 1360 762"/>
          <path d="M30-160C390 90 18 350 270 624S570 960 340 1360"/>
          <path d="M60-160C422 106 56 360 300 612S602 968 372 1360"/>
          <path d="M970-140C740 160 1180 370 970 680S742 980 1020 1360"/>
          <path d="M944-140C712 150 1148 374 940 664S710 996 990 1360"/>
        </g>
      </g>
    </svg>
    <div className="water-frost" />
  </div>;
}
