export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="glass-panel p-6">
      <h3 className="section-title text-ember">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{message}</p>
      {onRetry && (
        <button className="button-secondary mt-4" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  )
}
