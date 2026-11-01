interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

/**
 * Material Symbols render their name as ligature text ("auto_awesome"), which screen
 * readers would read aloud. Icons are therefore always decorative here; any meaning
 * must be carried by adjacent visible or visually hidden text.
 */
export default function Icon({ name, className = "", filled = false }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
