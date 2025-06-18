import { LeadTable } from '@/components/data/LeadTable';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ENGAGEMENT_INTEREST, LEAD_UI_MESSAGES } from '@/constants/leads';
import { hasAdminRole, hasVolunteerRole } from '@/constants/roles';

export default function VolunteerLeadsPage() {
  const { roles } = useAuthStore();

  // Check if user has permission to create leads
  const canCreateLead = hasAdminRole(roles) || hasVolunteerRole(roles);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Leads</h1>
          <p className="text-muted-foreground">
            Manage and track volunteer journey leads
          </p>
        </div>
        {canCreateLead && (
          <Button disabled className="opacity-50" title={LEAD_UI_MESSAGES.ACTIONS.CREATE_COMING_SOON}>
            <Plus className="mr-2 h-4 w-4" />
            New Volunteer Lead
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volunteer Journey Leads</CardTitle>
          <CardDescription>
            View and manage all volunteer leads assigned to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadTable engagementInterestFilter={ENGAGEMENT_INTEREST.VOLUNTEER} />
        </CardContent>
      </Card>
    </div>
  );
}