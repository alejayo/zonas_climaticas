import CatastroSearch from '@/components/catastro-search';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8 md:p-12 font-body">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-primary font-headline tracking-tight lg:text-5xl">
            GeoCatastro España
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Introduce una referencia catastral para obtener su información geográfica y un análisis contextual por IA.
          </p>
        </header>

        <CatastroSearch />
      </div>
    </main>
  );
}
