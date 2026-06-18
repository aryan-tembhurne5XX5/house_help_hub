
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X } from "lucide-react";
import { isAuthenticated, getCurrentRole, getCurrentUserId, getDashboardPath } from "@/utils/auth";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'user' | 'worker' | 'admin' | null>(null);
  const [userId, setUserId] = useState<number>(0);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setUserType(getCurrentRole());
      setUserId(getCurrentUserId());
    } else {
      setIsLoggedIn(false);
      setUserType(null);
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo />
            <span className="text-xl font-bold"></span>
          </Link>

          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isOpen ? <X /> : <Menu />}
            </Button>
          ) : (
            <nav className="flex items-center gap-4">
              <Link to="/" className="text-foreground/70 hover:text-foreground transition">Home</Link>
              <Link to="/about" className="text-foreground/70 hover:text-foreground transition">About</Link>
              <Link to="/contact" className="text-foreground/70 hover:text-foreground transition">Contact</Link>
              {isLoggedIn && (
                <Link to={getDashboardPath()} className="text-foreground/70 hover:text-foreground transition">Dashboard</Link>
              )}

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {(userType === 'user' || userType === 'worker') && (
                    <NotificationBell userType={userType} userId={userId} />
                  )}
                  <ProfileAvatar userType={userType} />
                </div>
              ) : (
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              )}
            </nav>
          )}
        </div>

        {isMobile && isOpen && (
          <div className="py-4">
            <nav className="flex flex-col gap-3">
              <Link to="/" onClick={toggleMenu} className="text-foreground/70 hover:text-foreground transition py-2">Home</Link>
              <Link to="/about" onClick={toggleMenu} className="text-foreground/70 hover:text-foreground transition py-2">About</Link>
              <Link to="/contact" onClick={toggleMenu} className="text-foreground/70 hover:text-foreground transition py-2">Contact</Link>
              {isLoggedIn && (
                <Link to={getDashboardPath()} onClick={toggleMenu} className="text-foreground/70 hover:text-foreground transition py-2">Dashboard</Link>
              )}

              {isLoggedIn ? (
                <div className="py-2 flex items-center justify-between">
                  <ProfileAvatar userType={userType} />
                  {(userType === 'user' || userType === 'worker') && (
                    <NotificationBell userType={userType} userId={userId} />
                  )}
                </div>
              ) : (
                <Link to="/auth" onClick={toggleMenu}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
