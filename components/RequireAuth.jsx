'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function RequireAuth({ children, fallback = null }) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated') {
      // Check if there's a verification cookie (custom Discord OAuth flow)
      const checkVerification = async () => {
        try {
          const res = await fetch('/api/verification/status');
          const data = await res.json();
          
          if (data.status === 'not_logged_in' || data.status === 'not_found') {
            // No session at all, redirect to login
            router.push('/login');
            return;
          }
          
          if (!data.verified) {
            // User is logged in via Discord but not verified - redirect to waiting page
            router.push('/waiting');
            return;
          }
          
          // User is verified
          setVerificationStatus(data);
          setLoading(false);
        } catch (err) {
          console.error('Error checking verification:', err);
          router.push('/login');
        }
      };
      
      checkVerification();
      return;
    }

    // If using NextAuth session
    if (session) {
      // Additional check: is the user verified?
      const checkVerification = async () => {
        try {
          const res = await fetch('/api/verification/status');
          const data = await res.json();
          
          if (!data.verified) {
            // User is logged in but not verified
            router.push('/waiting');
            return;
          }
          
          setVerificationStatus(data);
          setLoading(false);
        } catch (err) {
          console.error('Error checking verification:', err);
          setLoading(false);
        }
      };
      
      checkVerification();
    }
  }, [session, sessionStatus, router]);

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification de votre compte...</p>
        </div>
      </div>
    );
  }

  // If not authenticated at all and no verification cookie
  if (sessionStatus === 'unauthenticated' && !verificationStatus) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Redirection vers la connexion...</p>
      </div>
    );
  }

  return children;
}
