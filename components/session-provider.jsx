// /workspaces/mk8dx-hub/components/session-provider.jsx
'use client';

import { SessionProvider } from 'next-auth/react';

export default function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}