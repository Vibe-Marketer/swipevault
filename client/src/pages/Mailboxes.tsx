import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Mailboxes() {
  const { data: mailboxes, isLoading } = trpc.mailboxes.list.useQuery();
  const { data: authUrl } = trpc.mailboxes.getAuthUrl.useQuery();
  const utils = trpc.useUtils();

  const deleteMailbox = trpc.mailboxes.delete.useMutation({
    onSuccess: () => {
      utils.mailboxes.list.invalidate();
      toast.success("Mailbox disconnected");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const syncMailbox = trpc.mailboxes.sync.useMutation({
    onSuccess: () => {
      toast.success("Sync started");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConnect = () => {
    if (authUrl?.url) {
      window.location.href = authUrl.url;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Connected Mailboxes</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Gmail accounts for email swipe collection
          </p>
        </div>
        <Button onClick={handleConnect}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Gmail
        </Button>
      </div>

      {!mailboxes || mailboxes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No mailboxes connected</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your Gmail account to start automatically collecting and analyzing email marketing examples
            </p>
            <Button onClick={handleConnect} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Mailbox
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mailboxes.map((mailbox) => (
            <Card key={mailbox.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {mailbox.emailAddress}
                    </CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        {mailbox.isActive ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                            Inactive
                          </>
                        )}
                      </span>
                      {mailbox.lastSyncAt && (
                        <span>
                          Last synced: {format(new Date(mailbox.lastSyncAt), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => syncMailbox.mutate({ id: mailbox.id })}
                      disabled={syncMailbox.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncMailbox.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Disconnect ${mailbox.emailAddress}?`)) {
                          deleteMailbox.mutate({ id: mailbox.id });
                        }
                      }}
                      disabled={deleteMailbox.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    Monitoring: INBOX
                  </Badge>
                  {mailbox.watchExpiresAt && (
                    <Badge variant="outline">
                      Watch expires: {format(new Date(mailbox.watchExpiresAt), "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

