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

  // Menu items pour utilisateurs connectés
  const authenticatedMenuItems = [
    { href: '/dashboard', label: displayName, icon: User, isProfile: true },
    { href: '/academy', label: 'Academy', icon: BookOpen },
    { href: '/tournaments', label: 'Tournois', icon: Calendar },
    { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  ];

  // Menu items pour utilisateurs non connectés
  const publicMenuItems = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/academy', label: 'Academy', icon: BookOpen },
    { href: '/tournaments', label: 'Tournois', icon: Calendar },
  ];

  const menuItems = isAuthenticated ? authenticatedMenuItems : publicMenuItems;

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="font-bold text-xl hidden sm:inline">MK8DX Hub</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button 
                variant="ghost" 
                className={`text-gray-300 hover:text-white hover:bg-white/10 ${
                  item.isProfile ? 'font-semibold text-white' : ''
                }`}
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
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.image && (
                <Image 
                  src={user.image} 
                  alt="Avatar" 
                  width={32} 
                  height={32} 
                  className="rounded-full border border-white/20"
                />
              )}
              <Button 
                onClick={() => signOut({ callbackUrl: '/' })}
                variant="outline"
                size="sm"
                className="border-white/20 hover:bg-white/10 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-white/90">
                Se Connecter
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/95 backdrop-blur-xl md:hidden z-40"
          onClick={closeMobileMenu}
        >
          <div 
            className="container mx-auto px-4 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info (si connecté) */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl mb-6">
                {user.image && (
                  <Image 
                    src={user.image} 
                    alt="Avatar" 
                    width={48} 
                    height={48} 
                    className="rounded-full border-2 border-white/20"
                  />
                )}
                <div>
                  <p className="font-bold text-lg">{displayName}</p>
                  <p className="text-sm text-gray-400">@{user.username}</p>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={closeMobileMenu}
                >
                  <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    item.isProfile 
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}>
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Auth Button */}
            <div className="mt-6 pt-6 border-t border-white/10">
              {isAuthenticated ? (
                <Button 
                  onClick={() => {
                    signOut({ callbackUrl: '/' });
                    closeMobileMenu();
                  }}
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              ) : (
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button className="w-full bg-white text-black hover:bg-white/90">
                    Se Connecter avec Discord
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
