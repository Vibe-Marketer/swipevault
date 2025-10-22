import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setUser(data);
        }
      })
      .catch(err => console.error('Auth check failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  };
}

