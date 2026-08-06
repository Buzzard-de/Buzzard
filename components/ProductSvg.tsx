function ProductSvg({ imageKey }: { imageKey: string }) {
  const common = { viewBox: "0 0 64 64", fill: "none", width: 56, height: 56 };

  switch (imageKey) {
    case "bremsen-disc":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="28" stroke="#c9a840" strokeWidth="3" />
          <circle cx="32" cy="32" r="16" stroke="#c9a840" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="32" cy="32" r="5" fill="#c9a840" />
        </svg>
      );
    case "bremsen-pads":
      return (
        <svg {...common}>
          <rect x="10" y="20" width="44" height="24" rx="4" stroke="#c9a840" strokeWidth="3" />
          <rect x="18" y="28" width="28" height="8" rx="2" fill="#c9a840" opacity="0.3" stroke="#c9a840" strokeWidth="1.5" />
        </svg>
      );
    case "oel":
    case "oel-gear":
    case "oel-coolant":
      return (
        <svg {...common}>
          <rect x="22" y="8" width="20" height="8" rx="3" stroke="#c9a840" strokeWidth="2.5" />
          <rect x="16" y="16" width="32" height="38" rx="5" stroke="#c9a840" strokeWidth="3" />
          <path d="M26 30 Q32 24 38 30 Q32 36 26 30Z" fill="#c9a840" opacity="0.5" />
        </svg>
      );
    case "filter-oil":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="22" stroke="#c9a840" strokeWidth="3" />
          <path d="M24 32h16M32 24v16" stroke="#c9a840" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "filter-cabin":
      return (
        <svg {...common}>
          <rect x="12" y="18" width="40" height="28" rx="6" stroke="#c9a840" strokeWidth="3" />
          <path d="M20 26 Q32 20 44 26" stroke="#c9a840" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "zuendung":
      return (
        <svg {...common}>
          <ellipse cx="32" cy="32" rx="10" ry="22" stroke="#c9a840" strokeWidth="3" />
          <circle cx="32" cy="32" r="6" fill="#c9a840" opacity="0.4" stroke="#c9a840" strokeWidth="2" />
        </svg>
      );
    case "batterie":
      return (
        <svg {...common}>
          <rect x="10" y="18" width="44" height="30" rx="5" stroke="#c9a840" strokeWidth="3" />
          <rect x="10" y="14" width="12" height="6" rx="2" fill="#c9a840" opacity="0.5" stroke="#c9a840" strokeWidth="1.5" />
        </svg>
      );
    case "fahrwerk":
    case "fahrwerk-belt":
      return (
        <svg {...common}>
          <path d="M12 28 Q20 20 32 24 Q44 28 52 20" stroke="#c9a066" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M12 36 Q20 28 32 32 Q44 36 52 28" stroke="#c9a066" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "wischer":
      return (
        <svg {...common}>
          <path d="M12 75 A50 50 0 0 1 88 75" stroke="rgba(201,160,102,0.3)" strokeWidth="2" fill="none" />
          <path d="M16 72 A46 46 0 0 1 84 72" stroke="#c9a066" strokeWidth="5" strokeLinecap="round" fill="none" />
          <line x1="50" y1="72" x2="20" y2="28" stroke="#c9a066" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "tire":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="26" stroke="#c9a066" strokeWidth="3" />
          <circle cx="32" cy="32" r="14" stroke="#c9a066" strokeWidth="2" />
          <circle cx="32" cy="32" r="5" fill="#c9a066" />
        </svg>
      );
    case "bremsen-fluid":
      return (
        <svg {...common}>
          <rect x="20" y="10" width="24" height="36" rx="5" stroke="#c9a840" strokeWidth="3" />
          <circle cx="32" cy="52" r="4" stroke="#c9a840" strokeWidth="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="16" y="16" width="32" height="32" rx="4" stroke="#c9a840" strokeWidth="2" />
        </svg>
      );
  }
}

export default ProductSvg;
