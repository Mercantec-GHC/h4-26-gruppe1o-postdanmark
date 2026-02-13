import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1 min-h-[60vh] px-6">
      <h1 className="text-3xl font-bold mb-2">Post Danmark Wiki</h1>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Dokumentation for leveringsrute-appen – for brugere og udviklere.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/docs"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Åbn dokumentation
        </Link>
        <Link
          href="/docs/user-guide/getting-started"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          Brugerguide
        </Link>
        <Link
          href="/docs/developers/architecture"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          Udviklerguide
        </Link>
      </div>
    </div>
  );
}
