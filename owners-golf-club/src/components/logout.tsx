export function LogoutButton({ className = "text-xs text-mute hover:text-ink" }: { className?: string }) {
  return (
    <form action="/api/auth/logout" method="post" className="inline">
      <button type="submit" className={className}>ログアウト</button>
    </form>
  );
}
