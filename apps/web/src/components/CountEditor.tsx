import { useEffect, useState } from 'react';

interface Props {
  number: number;
  count: number;
  onSave: (count: number) => void;
  onClose: () => void;
}

/**
 * Modal sheet for setting an exact count. Triggered by long-pressing a sticker.
 * Quick buttons for 0/1/2/3, plus +/− and a numeric input for higher counts.
 */
export function CountEditor({ number, count, onSave, onClose }: Props) {
  const [value, setValue] = useState(count);
  useEffect(() => setValue(count), [count]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit sticker ${number}`}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">STICKER #{number}</h2>
          <button
            className="label-mono text-panini-ink/70 hover:text-panini-ink"
            onClick={onClose}
            aria-label="Close"
          >
            CLOSE
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            className="pill w-12 h-12 text-xl"
            onClick={() => setValue((v) => Math.max(0, v - 1))}
            aria-label="Decrement"
          >
            −
          </button>
          <input
            type="number"
            value={value}
            min={0}
            max={99}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 0 && n <= 99) setValue(Math.floor(n));
            }}
            className="font-display text-5xl text-center w-24 border-2 border-panini-ink rounded-xl py-2 bg-panini-cream"
            aria-label="Count"
          />
          <button
            className="pill w-12 h-12 text-xl"
            onClick={() => setValue((v) => Math.min(99, v + 1))}
            aria-label="Increment"
          >
            +
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              className={`pill ${value === n ? 'pill-active' : ''}`}
              onClick={() => setValue(n)}
            >
              {n === 0 ? 'None' : n === 1 ? 'Owned' : `×${n}`}
            </button>
          ))}
        </div>

        <button
          className="mt-5 w-full bg-panini-ink text-white border-2 border-panini-ink rounded-pill py-3 font-bold"
          onClick={() => onSave(value)}
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
