import { useParams, useNavigate } from 'react-router-dom';
import { useLead } from '../../hooks/queries/leads';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge';
import { LeadTypeBadge } from '../../components/leads/LeadTypeBadge';
import { LeadPriorityIndicator } from '../../components/leads/LeadPriorityIndicator';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User } from 'lucide-react';
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
            <h1 className="text-3xl font-bold tracking-tight">{lead.displayName}</h1>
            <p className="text-muted-foreground">Lead Details</p>
          </div>
          <Button>Edit Lead</Button>
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
                <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                <div className="text-sm text-muted-foreground">Full Name</div>
              </div>
            </div>
            
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <a href={`mailto:${lead.email}`} className="font-medium hover:underline">
                    {lead.email}
                  </a>
                  <div className="text-sm text-muted-foreground">Email</div>
                </div>
              </div>
            )}
            
            {lead.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <a href={`tel:${lead.phoneNumber}`} className="font-medium hover:underline">
                    {lead.phoneNumber}
                  </a>
                  <div className="text-sm text-muted-foreground">Phone</div>
                </div>
              </div>
            )}
            
            {lead.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="font-medium">
                    {lead.address.street1}
                    {lead.address.street2 && <>, {lead.address.street2}</>}
                  </div>
                  <div className="font-medium">
                    {lead.address.city}, {lead.address.state} {lead.address.zipCode}
                  </div>
                  <div className="text-sm text-muted-foreground">Address</div>
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
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Priority</span>
              <LeadPriorityIndicator priority={lead.priority} showLabel />
            </div>
            
            {lead.source && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Source</span>
                <span className="text-sm">{lead.source}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.assignedToName ? (
              <>
                <div>
                  <div className="font-medium">{lead.assignedToName}</div>
                  <div className="text-sm text-muted-foreground">Assigned To</div>
                </div>
                
                {lead.assignedOrganizationName && (
                  <div>
                    <div className="font-medium">{lead.assignedOrganizationName}</div>
                    <div className="text-sm text-muted-foreground">Organization</div>
                  </div>
                )}
                
                {lead.assignedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(lead.assignedAt), { addSuffix: true })}
                      </div>
                      <div className="text-sm text-muted-foreground">Assigned</div>
                    </div>
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
            
            {lead.lastContactedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Contacted</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {lead.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}