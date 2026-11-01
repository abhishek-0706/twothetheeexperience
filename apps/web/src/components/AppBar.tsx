import Icon from "@/components/ui/Icon";

export default function AppBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-margin py-space-sm w-full bg-surface/90 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className="relative w-9 h-9 rounded-full ring-1 ring-secondary/30 p-0.5 bg-surface-container-lowest overflow-hidden flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon name="face_3" className="text-secondary" filled />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-surface" />
        </div>

        <div className="flex flex-col text-left">
          <p className="font-headline-sm text-headline-sm text-primary tracking-tight leading-snug line-clamp-1 max-w-[200px]">
            Priya &amp; Arjun&apos;s Wedding
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <time dateTime="2027-02-14">Feb 14, 2027</time>
            <span aria-hidden="true">&bull;</span>
            <span>Jaipur</span>
          </p>
        </div>
      </div>
    </header>
  );
}
