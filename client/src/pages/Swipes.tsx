import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Mail, Calendar, Tag, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Swipes() {
  const { data: swipes, isLoading } = trpc.swipes.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();
  const toggleFavorite = trpc.swipes.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.swipes.list.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!swipes || swipes.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Mail className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No swipes yet</h2>
          <p className="text-muted-foreground mb-6">
            Connect a Gmail mailbox to start collecting email swipes
          </p>
          <Link href="/mailboxes">
            <Button>Connect Mailbox</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email Swipes</h1>
          <p className="text-muted-foreground mt-1">
            {swipes.length} swipes collected
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {swipes.map((swipe) => {
          const classification = swipe.aiClassification as any;
          const insights = swipe.aiInsights as any;

          return (
            <Card key={swipe.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/swipes/${swipe.id}`}>
                      <CardTitle className="text-xl hover:text-primary cursor-pointer">
                        {swipe.subject}
                      </CardTitle>
                    </Link>
                    <CardDescription className="mt-2 flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {swipe.senderName || swipe.senderEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {swipe.receivedDate && format(new Date(swipe.receivedDate), "MMM d, yyyy")}
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite.mutate({ id: swipe.id })}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        swipe.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {swipe.snippet}
                </p>

                {classification && (
                  <div className="flex flex-wrap gap-2">
                    {classification.useCases?.slice(0, 2).map((tag: any) => (
                      <Badge key={tag.name} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                    {classification.techniques?.slice(0, 2).map((tag: any) => (
                      <Badge key={tag.name} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

