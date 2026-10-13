export function CarryBanner({ count, onBring }: { count: number; onBring: () => void }) {
  if (count === 0) return null;
  return (
    <div id="banners">
      <div className="banner">
        <span>
          {count} {count === 1 ? 'task' : 'tasks'} unfinished from the past week.
        </span>
        <button type="button" className="btn" onClick={onBring}>
          Bring to today
        </button>
      </div>
    </div>
  );
}
