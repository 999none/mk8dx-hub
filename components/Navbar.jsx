'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Menu, X, LogOut, User, 
  BookOpen, Calendar, BarChart3, Gamepad2, Settings, Bell, Users
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackedPlayers, setTrackedPlayers] = useState(null);

  const isAuthenticated = status === 'authenticated' && session;
  const isLoading = status === 'loading';

  const user = session?.user;
  const displayName = user?.serverNickname || user?.name || user?.username || 'Joueur';

  const menuItems = [
    { href: '/lounge', label: 'Lounge', icon: Gamepad2 },
    { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { href: '/tournaments', label: 'Tournois', icon: Calendar },
    { href: '/academy', label: 'Academy', icon: BookOpen },
  ];

  // Fetch tracked players count from Lounge
  useEffect(() => {
    fetch('/api/lounge/player-count')
      .then(res => res.json())
      .then(data => {
        if (data.count) {
          setTrackedPlayers(data.count);
        }
      })
      .catch(err => console.error('Failed to fetch player count:', err));
  }, []);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04] bg-black/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <Trophy className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-sm text-gray-200">MK8DX Hub</span>
            </Link>
            
            {/* Tracked Players Count Badge */}
            {trackedPlayers && (
              <Link 
                href="/leaderboard" 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition-colors"
                title="Joueurs trackés depuis le Lounge MKCentral"
              >
                <Users className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-semibold text-green-500">
                  {trackedPlayers.toLocaleString('fr-FR')}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="nav-link text-gray-500 hover:text-white hover:bg-white/[0.04] text-sm font-normal"
                >
                  <item.icon className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.04]">
                    {user?.image ? (
                      <Image 
                        src={user.image} 
                        alt="" 
                        width={24} 
                        height={24} 
                        className="rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300 max-w-[100px] truncate">{displayName}</span>
                  </div>
                </Link>
                <Link href="/settings">
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/10 h-8 w-8"
                    title="Notifications & Paramètres"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                </Link>
                <Button 
                  onClick={() => signOut({ callbackUrl: '/' })}
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] h-8 w-8"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button 
                  size="sm"
                  className="bg-[#5865F2] text-white hover:bg-[#4752C4] text-sm font-medium h-8 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Se connecter
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/90" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="absolute top-14 left-0 right-0 bg-black border-t border-white/[0.04]">
            <div className="px-4 py-4">
              {isAuthenticated && user && (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg mb-4">
                    {user.image ? (
                      <Image src={user.image} alt="" width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-white/[0.04] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 text-sm truncate">{displayName}</p>
                      <p className="text-xs text-gray-600">Mon Dashboard</p>
                    </div>
                  </div>
                </Link>
              )}

              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                {isAuthenticated ? (
                  <div className="space-y-1">
                    <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-yellow-500 hover:bg-yellow-500/10 transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Notifications & Paramètres</span>
                      </div>
                    </Link>
                    <Button 
                      onClick={() => { signOut({ callbackUrl: '/' }); setMobileMenuOpen(false); }}
                      variant="ghost"
                      className="w-full justify-start text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Déconnexion
                    </Button>
                  </div>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4] flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Se connecter
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}