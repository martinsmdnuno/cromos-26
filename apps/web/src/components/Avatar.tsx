interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, color = '#7B4B9E', size = 36 }: AvatarProps) {
  // Dark colors get white text; light ones get ink. Hand-tuned for our 8-color palette.
  const lightColors = new Set(['#F4C430', '#6FBE44', '#2FB8AB']);
  const textColor = lightColors.has(color.toUpperCase()) ? '#1A1A1A' : '#FFFFFF';
  return (
    <div
      className="rounded-full border-2 border-panini-ink flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
