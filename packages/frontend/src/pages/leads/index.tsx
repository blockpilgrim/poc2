import { LeadTable } from '@/components/data/LeadTable';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function LeadsPage() {
  const { roles } = useAuthStore();

  // Check if user has permission to create leads
  const canCreateLead = roles.includes('Admin') || 
                       roles.includes('Foster Partner') ||
                       roles.includes('Volunteer Partner');


  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track your organization's leads
          </p>
        </div>
        {canCreateLead && (
          <Button disabled className="opacity-50" title="Lead creation coming soon">
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