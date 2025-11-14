export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold">Player View</h1>
      <p className="text-muted-foreground">Session ID: {id}</p>
      <p className="text-sm text-muted-foreground mt-4">Coming in Phase 2+</p>
    </div>
  );
}
