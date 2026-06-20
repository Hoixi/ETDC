export default function ArenaError() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center">
      <div className="card w-full">
        <div className="mb-2 text-4xl">🎪</div>
        <h1 className="neon-title mb-2 text-2xl">Link geçersiz</h1>
        <p className="text-sm text-gray-400">
          Giriş linkin süresi dolmuş ya da bozuk. Discord&apos;da{" "}
          <code className="text-neon-pink">/panel</code> yazıp yeni link al.
        </p>
      </div>
    </main>
  );
}
