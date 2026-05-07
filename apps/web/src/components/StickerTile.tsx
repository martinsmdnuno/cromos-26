import { memo, useRef } from 'react';
import clsx from 'clsx';
import { categoryForSticker, PALETTE, stickerLabel } from '@cromos/shared';
import { useT } from '../i18n/LangContext';

interface Props {
  number: number;
  count: number; // 0 missing, 1 owned, 2+ duplicate
  /** Short tap: toggle owned (off → 1, ≥1 → 0). The tile passes its own number
   *  back so the parent can keep one stable callback for ALL tiles, which is
   *  what lets React.memo actually skip non-tapped tiles. */
  onTap: (number: number, next: number) => void;
  /** Long press: open count editor. */
  onLongPress: (number: number) => void;
}

const LONG_PRESS_MS = 450;

/**
 * Sticker tile. State-driven styling:
 *  - missing: white + dashed border + faded number
 *  - owned: solid team color + white/dark number depending on color brightness
 *  - duplicate: owned + orange ×N badge ribbon (handled via .dup CSS in index.css)
 *
 * Input handling: native `onClick` for the tap, plus a small Pointer-Events
 * timer for the long-press detection. We previously rolled our own pointerup-
 * fires-onTap logic with `setPointerCapture`, but iOS Safari kept cancelling
 * the captured pointer the moment momentum scroll touched anything below the
 * fold — taps on every team section silently dropped. Native `click` already
 * handles all of: tap-vs-scroll arbitration, slop tolerance, double-tap delay
 * (with `touch-action: manipulation`), and synthetic-mouse-event suppression.
 *
 * The tile is memoised. With stable parent callbacks for `onTap`/`onLongPress`
 * and primitive `number`/`count` props, a tap only re-renders the one tile
 * whose count changed, instead of the whole 980-tile grid.
 */
export const StickerTile = memo(function StickerTile({
  number,
  count,
  onTap,
  onLongPress,
}: Props) {
  const { t } = useT();
  const cat = categoryForSticker(number);
  const teamColor = PALETTE[cat.colorKey];
  const isOwned = count > 0;
  const isDup = count > 1;

  // contrast: yellow/green/teal = dark text, others = white
  const lightBg = new Set(['#F4C430', '#6FBE44', '#2FB8AB']);
  const textColor = lightBg.has(teamColor) ? '#1A1A1A' : '#FFFFFF';

  const longPressTimer = useRef<number | null>(null);
  // True once the long-press timer has fired and the modal opened. Used to
  // swallow the click that follows when the user finally lifts their finger.
  const longPressFired = useRef(false);

  const startLongPress = () => {
    longPressFired.current = false;
    if (longPressTimer.current !== null) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      onLongPress(number);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    cancelLongPress();
    if (longPressFired.current) {
      // Long-press already opened the modal — don't also toggle the count.
      longPressFired.current = false;
      e.preventDefault();
      return;
    }
    onTap(number, isOwned ? 0 : 1);
  };

  const status = !isOwned
    ? t('sticker.aria.missing')
    : isDup
      ? t('sticker.aria.owned_n', { n: count })
      : t('sticker.aria.owned');
  const display = stickerLabel(number);
  const ariaLabel = t('sticker.aria.label', {
    n: display,
    category: t(`category.${cat.id}`),
    status,
  });

  return (
    <button
      type="button"
      className={clsx('sticker-tile', !isOwned && 'missing', isDup && 'dup')}
      style={isOwned ? { background: teamColor, color: textColor } : undefined}
      data-count={isDup ? count : undefined}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      aria-pressed={isOwned}
    >
      {display}
    </button>
  );
});
