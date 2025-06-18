import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { authService } from '@/services/authService';
import { getUserInitials } from '@/utils/userHelpers';
import { hasVolunteerRole, hasFosterRole, hasAdminRole } from '@/constants/roles';

const DEFAULT_THEME_COLOR = '#007ACC';

export function Header() {
  const { user, theme, isAuthenticated, roles } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect on error to ensure user is logged out
      window.location.href = '/login';
    }
  };

  return (
    <nav
      className="border-b px-6 py-4"
      style={{
        borderColor: theme?.primaryColor || DEFAULT_THEME_COLOR,
      }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          {theme?.logo && (
            <img
              src={theme.logo}
              alt={theme.name || 'Partner Portal'}
              className="h-8 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <Link
            to="/"
            className="text-lg font-semibold transition-colors hover:opacity-80"
            style={{ color: theme?.primaryColor || DEFAULT_THEME_COLOR }}
          >
            {theme?.name || 'Partner Portal'}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <nav className="flex items-center gap-4 mr-4">
                <Link
                  to="/"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Home
                </Link>
                {/* Role-based lead navigation */}
                {hasVolunteerRole(roles) && (
                  <Link
                    to="/leads/volunteer"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Volunteer Leads
                  </Link>
                )}
                {hasFosterRole(roles) && (
                  <Link
                    to="/leads/ready-now"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Ready Now Leads
                  </Link>
                )}
                {hasAdminRole(roles) && (
                  <Link
                    to="/leads"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    All Leads
                  </Link>
                )}
              </nav>
              <Link 
                to="/profile" 
                className="transition-transform hover:scale-105"
                aria-label="View profile"
              >
                <Avatar className="size-9 cursor-pointer border-2" style={{ borderColor: theme?.primaryColor || DEFAULT_THEME_COLOR }}>
                  <AvatarFallback
                    className="text-sm font-medium"
                    style={{
                      backgroundColor: theme?.primaryColor || DEFAULT_THEME_COLOR,
                      color: '#ffffff',
                    }}
                  >
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                style={{
                  borderColor: theme?.primaryColor || DEFAULT_THEME_COLOR,
                  color: theme?.primaryColor || DEFAULT_THEME_COLOR,
                }}
                className="hover:opacity-80"
                aria-label="Log out of your account"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button
                variant="default"
                size="sm"
                style={{
                  backgroundColor: theme?.primaryColor || DEFAULT_THEME_COLOR,
                  color: '#ffffff',
                }}
                className="hover:opacity-90"
                aria-label="Log in to your account"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}