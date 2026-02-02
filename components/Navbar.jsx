'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Menu, X, LogOut, User, 
  BookOpen, Calendar, BarChart3
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated' && session;
  const isLoading = status === 'loading';

  const user = session?.user;
  const displayName = user?.serverNickname || user?.name || user?.username || 'Joueur';

  const menuItems = [
    { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { href: '/tournaments', label: 'Tournois', icon: Calendar },
    { href: '/academy', label: 'Academy', icon: BookOpen },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04] bg-black/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <Trophy className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-sm text-gray-200">MK8DX Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-500 hover:text-white hover:bg-white/[0.04] text-sm font-normal"
                >
                  <item.icon className="w-4 h-4 mr-2" />
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
                  className="bg-white text-black hover:bg-gray-200 text-sm font-medium h-8"
                >
                  Connexion
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
                  <Button 
                    onClick={() => { signOut({ callbackUrl: '/' }); setMobileMenuOpen(false); }}
                    variant="ghost"
                    className="w-full justify-start text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Déconnexion
                  </Button>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-white text-black hover:bg-gray-200">
                      Se Connecter
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