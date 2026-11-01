import { isoTime, minutesToTime } from "./time";

interface TimeRangeProps {
  start: number;
  end: number;
}

export default function TimeRange({ start, end }: TimeRangeProps) {
  return (
    <>
      <time dateTime={isoTime(start)}>{minutesToTime(start)}</time>
      <span aria-hidden="true"> — </span>
      <span className="sr-only"> to </span>
      <time dateTime={isoTime(end)}>{minutesToTime(end)}</time>
    </>
  );
}
