import React, { useState, useEffect } from 'react';
import { SkipForward } from 'lucide-react';
import { STRINGS } from '../constants/strings';

interface AutoSkipButtonProps {
  onSkip: () => void;
  initialSeconds?: number;
}

export const AutoSkipButton: React.FC<AutoSkipButtonProps> = React.memo(({ onSkip, initialSeconds = 3 }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds, onSkip]);

  return (
    <button
      className="btn btn-danger"
      onClick={onSkip}
      style={{ padding: '0.32rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
      title="تعدية الدور لعدم وجود حركات صالحة"
    >
      <SkipForward size={14} />
      <span>{STRINGS.skipTurn} ({seconds})</span>
    </button>
  );
});
