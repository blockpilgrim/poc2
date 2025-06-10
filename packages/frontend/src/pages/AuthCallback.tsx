import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const callbackProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate processing
      if (callbackProcessed.current) {
        console.log('[AuthCallback] Callback already processed, skipping...');
        return;
      }
      callbackProcessed.current = true;
      
      try {
        // Check if we already have a token (in case of duplicate callback)
        const existingToken = sessionStorage.getItem('poc_portal_token');
        const urlParams = new URLSearchParams(window.location.search);
        const hasTokenInUrl = urlParams.has('token');
        
        if (existingToken && !hasTokenInUrl) {
          console.log('[AuthCallback] Token already exists and no new token in URL, redirecting...');
          navigate('/', { replace: true });
          return;
        }
        
        // Only process callback if we have tokens in the URL
        if (hasTokenInUrl) {
          await authService.handleCallback();
        }
        
        // Get redirect URL from state if available
        const redirectUrl = urlParams.get('redirectUrl') || '/';
        
        navigate(redirectUrl, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Authentication callback failed:', err);
        
        // Check again if authentication actually succeeded despite the error
        const tokenAfterError = sessionStorage.getItem('poc_portal_token');
        if (tokenAfterError) {
          console.log('[AuthCallback] Token exists after error, likely a timing issue');
          navigate('/', { replace: true });
          return;
        }
        
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>
              There was a problem completing your login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Return to Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completing Login</CardTitle>
          <CardDescription>
            Please wait while we complete your authentication...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}