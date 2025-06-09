import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the redirect URL from router state or default to home
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // If already authenticated, redirect
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Initiate login flow with redirect URL
      await authService.login(window.location.origin + from);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to initiate login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome to Partner Portal</CardTitle>
          <CardDescription className="text-center">
            Sign in with your Microsoft account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Redirecting to Microsoft...
              </>
            ) : (
              'Sign in with Microsoft'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>You will be redirected to Microsoft to sign in.</p>
            <p className="mt-1">Use your organization account to access the portal.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;