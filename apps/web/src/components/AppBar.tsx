export default function AppBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-margin py-space-sm w-full bg-surface/90 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2">
        {/* Avatar with presence dot */}
        <div className="relative w-9 h-9 rounded-full ring-1 ring-secondary/30 p-0.5 bg-surface-container-lowest overflow-hidden flex items-center justify-center">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            face_3
          </span>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-surface" />
        </div>

        {/* Event name and date */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1">
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-snug line-clamp-1 max-w-[200px]">
              Priya &amp; Arjun&apos;s Wedding
            </span>
            <span className="material-symbols-outlined text-secondary text-[16px]">
              expand_more
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim inline-block" />
            Feb 14, 2027 &bull; Jaipur
          </span>
        </div>
      </div>

      {/* Trailing actions */}
      <div className="flex items-center gap-1">
        <button
          aria-label="Notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-full text-primary hover:text-secondary active:scale-95 transition-all duration-150 bg-surface-container-low/70"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error" />
        </button>
        <button
          aria-label="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:text-secondary active:scale-95 transition-all duration-150 bg-surface-container-low/70"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
