/** Re-mounts on every navigation, giving each screen a short app-like fade-in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex min-h-0 flex-1 flex-col">{children}</div>;
}
