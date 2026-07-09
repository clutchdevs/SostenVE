'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ui } from '../lib/ui';
import { Spinner } from './spinner';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** While true the button is disabled and shows a spinner + `pendingText`. */
  pending: boolean;
  /** Label shown while pending (defaults to "Procesando…"). */
  pendingText?: string;
  children: ReactNode;
}

/**
 * Primary submit button with a built-in loading state, so an action feels
 * immediate: on submit the caller flips `pending` and the button disables itself
 * (preventing double-submits on slow serverless cold starts) and shows a spinner.
 */
export function SubmitButton({
  pending,
  pendingText = 'Procesando…',
  children,
  className = '',
  disabled,
  ...rest
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 ${ui.primaryBtn} ${className}`}
      {...rest}
    >
      {pending && <Spinner />}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
