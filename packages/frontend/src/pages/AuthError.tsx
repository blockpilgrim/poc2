import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function AuthError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'An unknown authentication error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Failed</CardTitle>
          <CardDescription>
            We couldn't complete your login request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>This error might occur due to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Invalid or expired authentication request</li>
              <li>Insufficient permissions</li>
              <li>Account configuration issues</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md"
            >
              Go Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}