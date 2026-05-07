import { useRef } from 'react';
import clsx from 'clsx';
import { categoryForSticker, PALETTE, stickerLabel } from '@cromos/shared';
import { useT } from '../i18n/LangContext';

interface Props {
  number: number;
  count: number; // 0 missing, 1 owned, 2+ duplicate
  /** Short tap: toggle owned (off → 1, ≥1 → 0). */
  onTap: (next: number) => void;
  /** Long press: open count editor. */
  onLongPress: () => void;
}

const LONG_PRESS_MS = 450;
const MOVE_SLOP_PX = 8;

/**
 * Sticker tile. State-driven styling:
 *  - missing: white + dashed border + faded number
 *  - owned: solid team color + white/dark number depending on color brightness
 *  - duplicate: owned + orange ×N badge ribbon (handled via .dup CSS in index.css)
 *
 * Input handling uses Pointer Events so we get ONE event stream regardless of mouse,
 * touch or pen. Mixing onTouch* + onMouse* produced ghost double-taps on iOS Safari
 * because the browser synthesizes mouse events ~300ms after touchend, and our handlers
 * fired onTap twice. With pointer events we also get free scroll cancellation
 * (pointercancel) and no need to preventDefault.
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
  const activePointer = useRef<number | null>(null);
  const startXY = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const reset = () => {
    clearTimer();
    activePointer.current = null;
    startXY.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== null) return; // ignore secondary pointers
    activePointer.current = e.pointerId;
    startXY.current = { x: e.clientX, y: e.clientY };
    longPressed.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
      reset();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current || !startXY.current) return;
    const dx = e.clientX - startXY.current.x;
    const dy = e.clientY - startXY.current.y;
    if (dx * dx + dy * dy > MOVE_SLOP_PX * MOVE_SLOP_PX) reset();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return;
    const wasPressing = longPressTimer.current !== null;
    reset();
    if (wasPressing && !longPressed.current) onTap(isOwned ? 0 : 1);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return;
    reset();
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
      onPointerLeave={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      aria-pressed={isOwned}
    >
      {display}
    </button>
  );
}
