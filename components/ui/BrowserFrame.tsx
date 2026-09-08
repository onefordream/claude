import { ReactNode } from "react";
import Icon from "./Icon";

export default function BrowserFrame({
  url = "school.growth-note.jp",
  title,
  children,
  className = "",
}: {
  url?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`browser ${className}`} aria-hidden="true">
      <div className="browser__bar">
        <span className="browser__dot" />
        <span className="browser__dot" />
        <span className="browser__dot" />
        <span className="browser__url">{url}</span>
      </div>
      <div className="browser__body">
        {title && (
          <div className="browser__head">
            <span className="browser__title">{title}</span>
            <Icon name="search" size={16} className="!text-[#9AA3A0]" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function StudentRow({
  initial,
  name,
  note,
}: {
  initial: string;
  name: string;
  note: string;
}) {
  return (
    <div className="stu-row">
      <span className="name">
        <span className="stu-avatar">{initial}</span>
        {name}
      </span>
      <span className="note">{note}</span>
      <span className="stu-btn">確認</span>
    </div>
  );
}
