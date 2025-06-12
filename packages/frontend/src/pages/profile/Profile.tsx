import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Shield, Users } from 'lucide-react';

export function ProfilePage() {
  const { user, initiative, initiativeDisplayName, organization, theme, roles } = useAuthStore();

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No user data available</p>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user.displayName) return user.email.charAt(0).toUpperCase();
    const parts = user.displayName.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  // Format role names for display
  const formatRoleName = (role: string) => {
    return role
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8" role="main" aria-label="User profile">
      <div className="space-y-6">
        {/* Profile Header Card */}
        <Card className="overflow-hidden">
          <div
            className="h-32 bg-gradient-to-br from-primary/20 to-primary/10"
            style={{
              background: `linear-gradient(135deg, ${theme?.primaryColor}20 0%, ${theme?.primaryColor}10 100%)`,
            }}
          />
          <CardHeader className="-mt-16 pb-4">
            <div className="flex items-end gap-6">
              <Avatar className="size-32 border-4 border-background shadow-xl">
                <AvatarFallback
                  className="text-3xl font-semibold"
                  style={{
                    backgroundColor: theme?.primaryColor || '#007ACC',
                    color: '#ffffff',
                  }}
                >
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <CardTitle className="text-3xl">{user.displayName || user.email}</CardTitle>
                <CardDescription className="text-base">{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" style={{ color: theme?.primaryColor }} />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Organization & Initiative Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" style={{ color: theme?.primaryColor }} />
              Organization & Initiative
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{organization.name}</p>
              </div>
            )}
            {initiative && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Initiative</p>
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: theme?.primaryColor }}
                  />
                  <p className="font-medium">{initiativeDisplayName || initiative}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles & Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" style={{ color: theme?.primaryColor }} />
              Roles & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roles && roles.length > 0 ? (
                roles.map((role, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border p-3"
                    style={{ borderColor: `${theme?.primaryColor}30` }}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${theme?.primaryColor}10`,
                        color: theme?.primaryColor,
                      }}
                    >
                      <Users className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{formatRoleName(role)}</p>
                      <p className="text-sm text-muted-foreground">
                        Access to {role.includes('network') ? 'all network' : 'organization'} data
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No roles assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            {user.organizationId && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Organization ID</p>
                <p className="font-mono text-sm">{user.organizationId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}