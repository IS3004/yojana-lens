export default function Skeleton({ className = '', count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
        />
      ))}
    </>
  )
}
