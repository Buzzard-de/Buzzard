interface CategoryIconProps {
  name: string;
  size?: number;
}

export default function CategoryIcon({ name, size = 18 }: CategoryIconProps) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    width: size,
    height: size,
  };

  switch (name) {
    case "car":
      return (
        <svg {...props}>
          <path d="M5 17h14M5 17l1-4h12l1 4M7 13l1.5-4h7L17 13" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
        </svg>
      );
    case "sport":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M8 10h8M8 14h8" />
        </svg>
      );
    case "home":
      return (
        <svg {...props}>
          <path d="M3 10.5L12 3l9 7.5V21H3z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    case "garden":
      return (
        <svg {...props}>
          <path d="M12 22V12M12 12C12 6 18 4 18 4s-2 6-8 6M12 12C12 6 6 4 6 4s2 6 8 6" />
        </svg>
      );
    case "tools":
      return (
        <svg {...props}>
          <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.1 2.1-3.3-3.3 2.1-2.1z" />
        </svg>
      );
    case "build":
      return (
        <svg {...props}>
          <path d="M2 20h20M4 20V10l8-6 8 6v10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "electronics":
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M8 19h8" />
        </svg>
      );
    case "appliance":
      return (
        <svg {...props}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <circle cx="12" cy="14" r="4" />
        </svg>
      );
    case "care":
      return (
        <svg {...props}>
          <path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
        </svg>
      );
    case "pet":
      return (
        <svg {...props}>
          <circle cx="8" cy="9" r="2" />
          <circle cx="16" cy="9" r="2" />
          <circle cx="5" cy="14" r="2" />
          <circle cx="19" cy="14" r="2" />
          <path d="M12 18c-3 0-5-2-5-4 0-2 2-3 5-3s5 1 5 3-2 4-5 4z" />
        </svg>
      );
    case "food":
      return (
        <svg {...props}>
          <path d="M6 3v8a4 4 0 008 0V3M14 3v8a4 4 0 008 0V3" />
        </svg>
      );
    case "baby":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-1a6 6 0 0112 0v1" />
        </svg>
      );
    case "fashion":
      return (
        <svg {...props}>
          <path d="M6 3l6 3 6-3 2 5-4 2v12H8V10L4 8z" />
        </svg>
      );
    case "parts":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      );
    case "oil":
      return (
        <svg {...props}>
          <path d="M10 2h4v4h-4zM8 6h8l-1 14H9L8 6z" />
        </svg>
      );
    case "battery":
      return (
        <svg {...props}>
          <rect x="2" y="7" width="18" height="10" rx="2" />
          <path d="M22 11v2M6 7V5h4v2" />
        </svg>
      );
    case "tire":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "tuning":
      return (
        <svg {...props}>
          <path d="M3 12h18M12 3l3 9-3 9-3-9 3-9z" />
        </svg>
      );
    case "star":
      return (
        <svg {...props}>
          <polygon points="12 2 15 9 22 9 17 14 19 22 12 18 5 22 7 14 2 9 9 9" />
        </svg>
      );
    case "truck":
      return (
        <svg {...props}>
          <path d="M1 6h13v9H1zM14 9h4l3 3v3h-7V9z" />
          <circle cx="5.5" cy="17" r="2" />
          <circle cx="18.5" cy="17" r="2" />
        </svg>
      );
    case "box":
      return (
        <svg {...props}>
          <path d="M12 2l9 5-9 5-9-5 9-5zM3 7v10l9 5 9-5V7" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.11 2 2 0 014 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.08a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "return":
      return (
        <svg {...props}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
