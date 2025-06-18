import { useParams, useNavigate } from 'react-router-dom';
import { useLead } from '../../hooks/queries/leads';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge';
import { LeadTypeBadge } from '../../components/leads/LeadTypeBadge';
import { ArrowLeft, Mail, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading, error } = useLead(id!);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Lead not found</h2>
          <p className="text-muted-foreground mb-4">
            The lead you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/leads')}>
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/leads')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leads
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.subjectName}</h1>
            <p className="text-muted-foreground">Lead Details</p>
          </div>
          <Button disabled className="opacity-50" title="Lead editing coming soon">
            Edit Lead
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{lead.subjectName}</div>
                <div className="text-sm text-muted-foreground">Full Name</div>
              </div>
            </div>
            
            {lead.subjectEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <a href={`mailto:${lead.subjectEmail}`} className="font-medium hover:underline">
                    {lead.subjectEmail}
                  </a>
                  <div className="text-sm text-muted-foreground">Email</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Status */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <LeadStatusBadge status={lead.status} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Type</span>
              <LeadTypeBadge type={lead.type} />
            </div>
            
          </CardContent>
        </Card>

        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.leadOwnerName ? (
              <>
                <div>
                  <div className="font-medium">{lead.leadOwnerName}</div>
                  <div className="text-sm text-muted-foreground">Lead Owner</div>
                </div>
                
                {lead.assignedOrganizationName && (
                  <div>
                    <div className="font-medium">{lead.assignedOrganizationName}</div>
                    <div className="text-sm text-muted-foreground">Organization</div>
                  </div>
                )}
                
              </>
            ) : (
              <p className="text-muted-foreground">This lead is not currently assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </div>
                <div className="text-sm text-muted-foreground">Created</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                </div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}