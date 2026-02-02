'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Menu, X, LogOut, User, 
  BookOpen, Calendar, BarChart3, Home
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated' && session;
  const isLoading = status === 'loading';

  const user = session?.user;
  const displayName = user?.serverNickname || user?.name || user?.username || 'Joueur';

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Menu items - Same for both authenticated and public
  const menuItems = [
    { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { href: '/tournaments', label: 'Tournois', icon: Calendar },
    { href: '/academy', label: 'Academy', icon: BookOpen },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Trophy className="w-5 h-5 text-gray-400" />
            <span className="font-semibold text-sm sm:text-base text-gray-200">MK8DX Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-400 hover:text-gray-200 hover:bg-neutral-900 text-sm"
                >
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                    {user?.image ? (
                      <Image 
                        src={user.image} 
                        alt="Avatar" 
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
                  size="sm"
                  className="text-gray-500 hover:text-gray-300 hover:bg-neutral-900"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button 
                  size="sm"
                  className="bg-gray-200 text-black hover:bg-gray-300 text-sm"
                >
                  Connexion
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-400 hover:text-gray-200 hover:bg-neutral-900 rounded-lg transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80" 
            onClick={closeMobileMenu}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-14 left-0 right-0 bg-black border-t border-gray-800">
            <div className="px-4 py-4">
              {/* User Info (if connected) */}
              {isAuthenticated && user && (
                <Link href="/dashboard" onClick={closeMobileMenu}>
                  <div className="flex items-center gap-3 p-3 bg-neutral-900 rounded-lg mb-4">
                    {user.image ? (
                      <Image 
                        src={user.image} 
                        alt="Avatar" 
                        width={40} 
                        height={40} 
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 text-sm truncate">{displayName}</p>
                      <p className="text-xs text-gray-500">Mon Dashboard</p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Menu Items */}
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={closeMobileMenu}
                  >
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-neutral-900 transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Auth Button */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                {isAuthenticated ? (
                  <Button 
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      closeMobileMenu();
                    }}
                    variant="ghost"
                    className="w-full justify-start text-gray-500 hover:text-gray-300 hover:bg-neutral-900"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Déconnexion
                  </Button>
                ) : (
                  <Link href="/login" onClick={closeMobileMenu}>
                    <Button className="w-full bg-gray-200 text-black hover:bg-gray-300">
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
