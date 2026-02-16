interface StatusDotProps {
  status: 'online' | 'offline' | 'busy';
  className?: string;
}

export default function StatusDot({ status, className = '' }: StatusDotProps) {
  const colorMap = {
    online: 'bg-status-online',
    busy: 'bg-status-busy',
    offline: 'bg-status-offline',
  };

  return (
    <span
      className={`w-3 h-3 rounded-full border-2 border-card block ${colorMap[status]} ${
        status === 'online' ? 'animate-pulse-dot' : ''
      } ${className}`}
      aria-label={`Estado: ${status}`}
    />
  );
}
