/** A shared geometric signature for both app shells. */
export function HexMark({className = ''}: {className?: string}) {
  return <svg className={`hex-mark ${className}`.trim()} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25L16 2.5Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="m10 12 6-3.5 6 3.5v8l-6 3.5-6-3.5v-8Z" fill="currentColor"/>
    <path d="M13.5 12.5v7m5-7v7m-5-3.5h5" stroke="var(--card)" strokeWidth="1.5"/>
  </svg>;
}
