import { memo, useRef } from 'react';
import clsx from 'clsx';
import { categoryForSticker, PALETTE, stickerLabel } from '@cromos/shared';
import { useT } from '../i18n/LangContext';

interface Props {
  number: number;
  count: number; // 0 missing, 1 owned, 2+ duplicate
  /** Short tap: toggle owned (off → 1, ≥1 → 0). The tile passes its own number
   *  back so the parent can keep a single stable callback for ALL tiles, which
   *  makes React.memo actually work. */
  onTap: (number: number, next: number) => void;
  /** Long press: open count editor. */
  onLongPress: (number: number) => void;
}

const LONG_PRESS_MS = 450;
const MOVE_SLOP_PX = 12;

/**
 * Sticker tile. State-driven styling:
 *  - missing: white + dashed border + faded number
 *  - owned: solid team color + white/dark number depending on color brightness
 *  - duplicate: owned + orange ×N badge ribbon (handled via .dup CSS in index.css)
 *
 * Input: Pointer Events with `setPointerCapture` so the tile keeps receiving
 * events even when momentum-scroll moves it under the user's finger or when the
 * touch slightly leaves the small (~56px) tile bounds. Without capture, iOS
 * would fire `pointerleave` mid-tap on every section below the fold, swallowing
 * the click — that's the bug where teams appeared "untouchable" on a long
 * scrolled page. We deliberately do NOT subscribe to `onPointerLeave`.
 *
 * The component is memoised. Combined with the `(number, next)` callback shape
 * and stable callback refs at the parent, props for non-tapped tiles stay
 * referentially equal across re-renders, so a tap only re-renders one tile
 * instead of all 980.
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
  const longPressed = useRef(false);
  const activePointer = useRef<number | null>(null);
  const startXY = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    activePointer.current = null;
    startXY.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== null) return; // ignore secondary pointers
    activePointer.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Older browsers without pointer capture: fall through, behaviour is the
      // same as before — pointerup must hit the same element.
    }
    startXY.current = { x: e.clientX, y: e.clientY };
    longPressed.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress(number);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current || !startXY.current) return;
    const dx = e.clientX - startXY.current.x;
    const dy = e.clientY - startXY.current.y;
    if (dx * dx + dy * dy > MOVE_SLOP_PX * MOVE_SLOP_PX) {
      // Movement crossed the slop threshold — treat as scroll/drag and abandon.
      cancel();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return;
    const wasPressing = longPressTimer.current !== null;
    const wasLong = longPressed.current;
    cancel();
    if (wasPressing && !wasLong) onTap(number, isOwned ? 0 : 1);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return;
    cancel();
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      aria-pressed={isOwned}
    >
      {display}
    </button>
  );
});
