'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui';
import { consumeSessionExpiredNotification } from '@/lib/api';

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. You've been signed out for security. Please sign in again to continue.";

/**
 * Shows a single, premium toast when the user was auto-signed out because their
 * session/token expired. The flag is set by the API client (on a 401) and
 * consumed here exactly once, so duplicate toasts never appear even when several
 * requests fail at the same time. Manual logouts never set the flag.
 */
export default function SessionExpiredNotifier() {
  const { showToast } = useToast();

  useEffect(() => {
    if (consumeSessionExpiredNotification()) {
      showToast(SESSION_EXPIRED_MESSAGE, 'warning');
    }
  }, [showToast]);

  return null;
}
