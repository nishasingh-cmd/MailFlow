import React, { useRef, useEffect, useCallback } from 'react';

interface VerificationCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  onComplete,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const updateDigits = useCallback(
    (newDigits: string[]) => {
      const code = newDigits.join('').slice(0, 6);
      onChange(code);
      if (code.length === 6 && onComplete) {
        onComplete(code);
      }
    },
    [onChange, onComplete]
  );

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index]) {
        newDigits[index] = '';
        updateDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        updateDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const inputValue = e.target.value;
    const digitOnly = inputValue.replace(/\D/g, '');

    if (!digitOnly) {
      const newDigits = [...digits];
      newDigits[index] = '';
      updateDigits(newDigits);
      return;
    }

    // Take the latest single digit if user typed in a box with content
    const singleDigit = digitOnly.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    updateDigits(newDigits);

    // Auto advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedDigits = pastedText.replace(/\D/g, '').slice(0, 6);

    if (pastedDigits.length > 0) {
      const newDigits = Array.from({ length: 6 }, (_, i) => pastedDigits[i] || '');
      updateDigits(newDigits);

      const nextFocusIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3 my-2"
      role="group"
      aria-label="Verification code input"
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInput(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(idx)}
          aria-label={`Digit ${idx + 1} of 6`}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-sans rounded-xl border outline-none transition-all duration-150 selection:bg-[#0b37a0] selection:text-white ${
            error
              ? 'border-red-500 text-red-500 bg-red-50/50 dark:bg-red-950/20 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
              : digit
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 text-slate-900 dark:text-white focus:border-[#0b37a0] focus:ring-2 focus:ring-[#0b37a0]/25'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:border-[#0b37a0] focus:ring-2 focus:ring-[#0b37a0]/25'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
};
