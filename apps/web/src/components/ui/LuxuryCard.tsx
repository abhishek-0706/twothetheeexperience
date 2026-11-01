interface LuxuryCardProps {
  children: React.ReactNode;
  className?: string;
  goldFoilTop?: boolean;
  champagne?: boolean;
  ambientGlow?: boolean;
}

export default function LuxuryCard({
  children,
  className = "",
  goldFoilTop = false,
  champagne = false,
  ambientGlow = false,
}: LuxuryCardProps) {
  const classes = [
    "luxury-card rounded-2xl bg-surface-container-lowest p-space-md",
    goldFoilTop && "gold-foil-top",
    champagne && "champagne-pill",
    ambientGlow && "ambient-glow",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
