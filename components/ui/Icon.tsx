export type IconName =
  | "notebook"
  | "refresh"
  | "target"
  | "chart"
  | "chat"
  | "calendar"
  | "monitor"
  | "phone"
  | "book"
  | "dumbbell"
  | "flag"
  | "ball"
  | "music"
  | "person"
  | "mail"
  | "check"
  | "arrow"
  | "pencil"
  | "help"
  | "search"
  | "trend-flat"
  | "unlink"
  | "users"
  | "sparkle";

export default function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg className={`ic ${className}`} style={{ width: size, height: size }}>
      <use href={`#ic-${name}`} />
    </svg>
  );
}
