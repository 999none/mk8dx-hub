'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Menu, X, LogOut, User, 
  BookOpen, Calendar, BarChart3, Gamepad2, Settings, Bell, Users, ChevronRight
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackedPlayers, setTrackedPlayers] = useState(null);
  const [scrollState, setScrollState] = useState({
    scrolled: false,
    scrollY: 0,
    direction: 'up'
  });

  const isAuthenticated = status === 'authenticated' && session;
  const isLoading = status === 'loading';

  const user = session?.user;
  const displayName = user?.serverNickname || user?.name || user?.username || 'Joueur';

  const menuItems = [
    { href: '/lounge', label: 'Lounge', icon: Gamepad2, color: 'green' },
    { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3, color: 'blue' },
    { href: '/tournaments', label: 'Tournois', icon: Calendar, color: 'yellow' },
    { href: '/academy', label: 'Academy', icon: BookOpen, color: 'purple' },
  ];

  // Check if a menu item is active
  const isActive = useCallback((href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }, [pathname]);

  // Get color classes for active state
  const getActiveColor = (color) => {
    const colors = {
      green: 'text-green-400 bg-green-500/10 border-green-500/30',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    };
    return colors[color] || colors.blue;
  };

  // Handle scroll effect
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const direction = currentScrollY > lastScrollY ? 'down' : 'up';
          
          setScrollState({
            scrolled: currentScrollY > 10,
            scrollY: currentScrollY,
            direction
          });
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Calculate dynamic styles based on scroll
  const navStyles = {
    backdropFilter: `blur(${scrollState.scrolled ? '16px' : '8px'})`,
    WebkitBackdropFilter: `blur(${scrollState.scrolled ? '16px' : '8px'})`,
    backgroundColor: scrollState.scrolled ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
    boxShadow: scrollState.scrolled 
      ? '0 4px 30px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05) inset' 
      : 'none',
    borderColor: scrollState.scrolled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
  };

  return (
    <>
      <nav 
        className="fixed top-0 w-full z-50 border-b transition-all duration-300 ease-out"
        style={navStyles}
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo with hover effect */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="group flex items-center gap-2 transition-all duration-200"
            >
              <div className="relative">
                <Trophy className="w-5 h-5 text-gray-500 group-hover:text-yellow-500 transition-colors duration-200 group-hover:scale-110 transform" />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
              <span className="font-semibold text-sm text-gray-200 group-hover:text-white transition-colors duration-200">
                MK8DX Hub
              </span>
            </Link>
            
            {/* Tracked Players Count Badge with animation */}
            {trackedPlayers && (
              <Link 
                href="/leaderboard" 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 hover:border-green-500/40 hover:scale-105 transition-all duration-200 group"
                title="Joueurs trackés depuis le Lounge MKCentral"
              >
                <Users className="w-3.5 h-3.5 text-green-500 group-hover:animate-bounce-subtle" />
                <span className="text-sm font-semibold text-green-500 tabular-nums">
                  {trackedPlayers.toLocaleString('fr-FR')}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation with active indicators */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`
                      relative overflow-hidden text-sm font-normal h-9 px-4
                      transition-all duration-200 ease-out
                      group
                      ${active 
                        ? getActiveColor(item.color) + ' border' 
                        : 'text-gray-500 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }
                    `}
                  >
                    {/* Icon with animation */}
                    <item.icon 
                      className={`
                        w-4 h-4 mr-2 transition-all duration-200
                        ${active ? '' : 'group-hover:scale-110 group-hover:rotate-3'}
                      `} 
                    />
                    {item.label}
                    
                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current animate-pulse-subtle" />
                    )}
                    
                    {/* Hover shine effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out" />
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-2">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full skeleton" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Dashboard link with enhanced hover */}
                <Link href="/dashboard">
                  <div 
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg 
                      transition-all duration-200 ease-out
                      border group
                      ${isActive('/dashboard')
                        ? 'bg-white/[0.08] border-white/20 text-white'
                        : 'bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.08] hover:border-white/10'
                      }
                    `}
                  >
                    {user?.image ? (
                      <div className="relative">
                        <Image 
                          src={user.image} 
                          alt="" 
                          width={24} 
                          height={24} 
                          className="rounded-full ring-2 ring-transparent group-hover:ring-white/20 transition-all duration-200"
                        />
                        {/* Online indicator */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
                      </div>
                    ) : (
                      <User className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    )}
                    <span className="text-sm text-gray-300 group-hover:text-white max-w-[100px] truncate transition-colors duration-200">
                      {displayName}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </Link>
                
                {/* Settings button with bell animation */}
                <Link href="/settings">
                  <Button 
                    variant="ghost"
                    size="icon"
                    className={`
                      h-8 w-8 transition-all duration-200 group
                      ${isActive('/settings')
                        ? 'text-yellow-500 bg-yellow-500/10'
                        : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/10'
                      }
                    `}
                    title="Notifications & Paramètres"
                  >
                    <Bell className="w-4 h-4 group-hover:animate-wiggle" />
                  </Button>
                </Link>
                
                {/* Logout button */}
                <Button 
                  onClick={() => signOut({ callbackUrl: '/' })}
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-all duration-200 group"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button 
                  size="sm"
                  className="btn-discord bg-[#5865F2] text-white hover:bg-[#4752C4] text-sm font-medium h-9 flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Se connecter
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button with animation */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200 active:scale-95"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <div className="relative w-5 h-5">
              <Menu 
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`} 
              />
              <X 
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`} 
              />
            </div>
          </button>
        </div>
        
        {/* Progress bar on scroll */}
        <div 
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-150"
          style={{
            width: `${scrollState.scrolled ? Math.min((scrollState.scrollY / Math.max((typeof document !== 'undefined' ? document.documentElement?.scrollHeight : 1000) - (typeof window !== 'undefined' ? window.innerHeight : 800), 1)) * 100, 100) : 0}%`,
            opacity: scrollState.scrollY > 100 ? 1 : 0
          }}
        />
      </nav>

      {/* Mobile Menu with animations */}
      <div 
        className={`
          fixed inset-0 z-[60] md:hidden
          transition-opacity duration-300
          ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Backdrop */}
        <div 
          className={`
            absolute inset-0 bg-black/90 backdrop-blur-sm
            transition-opacity duration-300
            ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={() => setMobileMenuOpen(false)} 
        />
        
        {/* Menu panel */}
        <div 
          className={`
            absolute top-14 left-0 right-0 bg-black/95 border-t border-white/[0.06]
            transition-all duration-300 ease-out
            ${mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
          `}
        >
          <div className="px-4 py-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            {/* User card */}
            {isAuthenticated && user && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <div 
                  className={`
                    flex items-center gap-3 p-3 rounded-xl mb-4
                    transition-all duration-200
                    border
                    ${isActive('/dashboard')
                      ? 'bg-white/[0.06] border-white/20'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/10'
                    }
                  `}
                >
                  <div className="relative">
                    {user.image ? (
                      <Image src={user.image} alt="" width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-white/[0.04] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 text-sm truncate">{displayName}</p>
                    <p className="text-xs text-gray-600">Mon Dashboard</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </Link>
            )}

            {/* Menu items with stagger animation */}
            <div className="space-y-1">
              {menuItems.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div 
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-200
                        ${active 
                          ? getActiveColor(item.color) + ' border'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${active ? '' : 'opacity-70'}`} />
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Auth section */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <div 
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-200
                        ${isActive('/settings')
                          ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
                          : 'text-yellow-500 hover:bg-yellow-500/10 border border-transparent'
                        }
                      `}
                    >
                      <Bell className="w-5 h-5" />
                      <span className="text-sm font-medium">Notifications & Paramètres</span>
                    </div>
                  </Link>
                  <button 
                    onClick={() => { signOut({ callbackUrl: '/' }); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Déconnexion</span>
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4] flex items-center justify-center gap-2 h-11">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Se connecter avec Discord
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
