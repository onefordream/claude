import { ReactNode } from "react";

export default function PhoneFrame({
  children,
  nav,
  className = "",
  time = "9:41",
}: {
  children: ReactNode;
  nav?: ReactNode;
  className?: string;
  time?: string;
}) {
  return (
    <div className={`phone ${className}`} aria-hidden="true">
      <div className="phone__screen">
        <div className="phone__notch" />
        <div className="phone__status">
          <span>{time}</span>
          <i />
        </div>
        <div className="phone__body">{children}</div>
        {nav}
      </div>
    </div>
  );
}
