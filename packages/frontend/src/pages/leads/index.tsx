import { LeadTable } from '@/components/data/LeadTable';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { LEAD_UI_MESSAGES } from '@/constants/leads';
import { hasAdminRole } from '@/constants/roles';

export default function LeadsPage() {
  const { roles } = useAuthStore();

  // Only admins can see all leads
  const isAdmin = hasAdminRole(roles);
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Admin can create any type of lead
  const canCreateLead = true;


  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Leads</h1>
          <p className="text-muted-foreground">
            Manage and track your organization's leads
          </p>
        </div>
        {canCreateLead && (
          <Button disabled className="opacity-50" title={LEAD_UI_MESSAGES.ACTIONS.CREATE_COMING_SOON}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            View and manage all leads assigned to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadTable />
        </CardContent>
      </Card>
    </div>
  );
}