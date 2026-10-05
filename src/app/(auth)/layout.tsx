export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/30 to-primary/5 p-4">
      {children}
    </main>
  );
}
