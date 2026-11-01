import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-xl font-semibold text-on-surface mb-2">Page not found</h2>
      <p className="text-on-surface-variant mb-6 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
      >
        Back to home
      </Link>
    </main>
  );
}
