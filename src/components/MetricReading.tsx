/** Separate a formatted reading from its unit without changing its text. */
export function MetricReading({value}: {value: string}) {
  const split = value.lastIndexOf(' ');
  if (split < 0) return <>{value}</>;
  return <><span className="metric-reading-amount">{value.slice(0, split)}</span>{' '}<small className="metric-reading-unit">{value.slice(split + 1)}</small></>;
}
