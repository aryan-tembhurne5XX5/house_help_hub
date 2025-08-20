
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X } from "lucide-react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'user' | 'worker' | 'admin' | null>(null);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  useEffect(() => {
    const storedUserType = localStorage.getItem('userType');
    if (storedUserType === 'user' || storedUserType === 'worker' || storedUserType === 'admin') {
      setIsLoggedIn(true);
      setUserType(storedUserType as 'user' | 'worker' | 'admin');
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
            <span className="text-xl font-bold">HouseHelpHub</span>
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
              
              {isLoggedIn ? (
                <ProfileAvatar userType={userType} />
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
              
              {isLoggedIn ? (
                <div className="py-2">
                  <ProfileAvatar userType={userType} />
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
