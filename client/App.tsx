import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const savedApiKey = localStorage.getItem('ai-usage-api-key');
    if (savedApiKey) {
      validateApiKey(savedApiKey);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      const data = await response.json();
      setApiKey(key);
      setUserId(data.userId);
      setIsAuthenticated(true);
      localStorage.setItem('ai-usage-api-key', key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsAuthenticated(false);
      localStorage.removeItem('ai-usage-api-key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (key: string) => {
    validateApiKey(key);
  };

  const handleLogout = () => {
    setApiKey('');
    setUserId('');
    setIsAuthenticated(false);
    setError('');
    localStorage.removeItem('ai-usage-api-key');
  };

  if (isAuthenticated) {
    return (
      <Dashboard 
        apiKey={apiKey} 
        userId={userId} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LoginPage 
      onLogin={handleLogin}
      isLoading={isLoading}
      error={error}
    />
  );
}