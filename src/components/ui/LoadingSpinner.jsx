export default function LoadingSpinner({ size = 24, color = '#3d5eff', className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0110 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
