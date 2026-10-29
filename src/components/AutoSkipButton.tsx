import React, { useState, useEffect, useRef } from 'react';
import { SkipForward } from 'lucide-react';
import { STRINGS } from '../constants/strings';

interface AutoSkipButtonProps {
  onSkip: () => void;
  initialSeconds?: number;
  disabled?: boolean;
}

export const AutoSkipButton: React.FC<AutoSkipButtonProps> = React.memo(({
  onSkip,
  initialSeconds = 3,
  disabled = false
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const hasTriggeredRef = useRef(false);
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  useEffect(() => {
    hasTriggeredRef.current = false;
    setSeconds(initialSeconds);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onSkipRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    onSkipRef.current();
  };

  return (
    <button
      type="button"
      className="btn btn-danger"
      onClick={handleClick}
      disabled={disabled || seconds === 0}
      style={{
        padding: '0.32rem 0.75rem',
        fontSize: '0.8rem',
        gap: '0.3rem',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      title="تعدية الدور لعدم وجود حركات صالحة"
    >
      <SkipForward size={14} />
      <span>{STRINGS.skipTurn} ({seconds})</span>
    </button>
  );
});
