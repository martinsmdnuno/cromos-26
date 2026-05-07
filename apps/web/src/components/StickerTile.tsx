import { useRef } from 'react';
import clsx from 'clsx';
import { categoryForSticker, PALETTE } from '@cromos/shared';
import { useT } from '../i18n/LangContext';

interface Props {
  number: number;
  count: number; // 0 missing, 1 owned, 2+ duplicate
  /** Short tap: toggle owned (off → 1, ≥1 → 0). */
  onTap: (next: number) => void;
  /** Long press: open count editor. */
  onLongPress: () => void;
}

/**
 * Sticker tile. State-driven styling:
 *  - missing: white + dashed border + faded number
 *  - owned: solid team color + white/dark number depending on color brightness
 *  - duplicate: owned + orange ×N badge ribbon (handled via .dup CSS in index.css)
 */
export function StickerTile({ number, count, onTap, onLongPress }: Props) {
  const { t } = useT();
  const cat = categoryForSticker(number);
  const teamColor = PALETTE[cat.colorKey];
  const isOwned = count > 0;
  const isDup = count > 1;

  // contrast: yellow/green/teal = dark text, others = white
  const lightBg = new Set(['#F4C430', '#6FBE44', '#2FB8AB']);
  const textColor = lightBg.has(teamColor) ? '#1A1A1A' : '#FFFFFF';

  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 450);
  };
  const cancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const end = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      if (!longPressed.current) onTap(isOwned ? 0 : 1);
    }
  };

  const status = !isOwned
    ? t('sticker.aria.missing')
    : isDup
      ? t('sticker.aria.owned_n', { n: count })
      : t('sticker.aria.owned');
  const ariaLabel = t('sticker.aria.label', {
    n: number,
    category: t(`category.${cat.id}`),
    status,
  });

  return (
    <button
      type="button"
      className={clsx('sticker-tile', !isOwned && 'missing', isDup && 'dup')}
      style={isOwned ? { background: teamColor, color: textColor } : undefined}
      data-count={isDup ? count : undefined}
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      aria-pressed={isOwned}
    >
      {number}
    </button>
  );
}
