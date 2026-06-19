import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { gql } from '@apollo/client';
import client from '@/lib/apolloClient';
import { isAuthenticated, getDashboardPath, getToken, logout, UserRole } from '@/utils/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ME_QUERY = gql`
  query Me {
    me {
      id
      role
      email
    }
  }
`;

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: UserRole;
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getToken();
  
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        const result = await client.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
        if (isMounted) {
          const data = result.data as any;
          if (data?.me) {
            setUserRole(data.me.role);
            setAuthorized(true);
          } else {
            throw new Error("Invalid session");
          }
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        logout();
        toast.error("Session expired. Please log in again.");
        if (isMounted) setAuthorized(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    verify();
    
    return () => { isMounted = false; };
  }, [token]);

  // If no token in localStorage, redirect immediately
  if (!token) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If the user's role does not match the route's required role, redirect to their dashboard
  if (userRole && userRole !== role) {
    return <Navigate to={getDashboardPath(userRole as UserRole)} replace />;
  }

  // Valid and authorized
  return <>{children}</>;
}
