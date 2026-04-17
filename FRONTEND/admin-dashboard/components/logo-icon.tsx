export function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDB022" />
          <stop offset="15%" stopColor="#FF6B6B" />
          <stop offset="30%" stopColor="#FF1493" />
          <stop offset="50%" stopColor="#9D4EDD" />
          <stop offset="70%" stopColor="#3A0CA3" />
          <stop offset="85%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#00D9FF" />
        </linearGradient>
      </defs>
      
      {/* Outer play button shape */}
      <path
        d="M 256 50 C 320 50 380 90 410 160 C 440 230 430 310 380 370 C 330 420 250 450 180 440 C 110 430 50 380 50 300 C 50 200 120 100 256 50 Z"
        fill="url(#logoGradient)"
      />
      
      {/* Inner white play triangle */}
      <path
        d="M 200 180 L 200 340 L 360 260 Z"
        fill="white"
        className="rounded-lg"
      />
    </svg>
  );
}
