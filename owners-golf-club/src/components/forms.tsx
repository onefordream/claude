"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";
import { Alert } from "./ui";

export function SubmitButton({ children, className, pendingText = "送信中…", confirm }: { children: ReactNode; className: string; pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** useActionState でエラー・完了メッセージを表示する汎用フォーム */
export function ActionForm({
  action,
  children,
  className = "space-y-5",
  resetOnSuccess = false,
  success,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** 成功時にフォーム項目の代わりに表示する内容 */
  success?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className} key={resetOnSuccess && state?.ok ? state.nonce : undefined}>
      {state?.error ? <Alert kind="error">{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert kind="success">{state.message}</Alert> : null}
      {state?.ok && success ? success : children}
    </form>
  );
}

/** 確認ダイアログ付きの小さな操作フォーム（Server Action を直接渡す） */
export function ConfirmForm({
  action,
  children,
  confirm,
  className,
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  confirm?: string;
  className: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="inline">
      {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <SubmitButton className={className} confirm={confirm}>
        {children}
      </SubmitButton>
    </form>
  );
}
