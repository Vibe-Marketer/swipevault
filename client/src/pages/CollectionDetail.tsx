import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Mail, Calendar, Loader2, FolderOpen } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";

export default function CollectionDetail() {
  const params = useParams<{ id: string }>();
  const collectionId = params.id;

  const { data, isLoading } = trpc.collections.get.useQuery({ id: collectionId! });
  const utils = trpc.useUtils();

  const toggleFavorite = trpc.swipes.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.collections.get.invalidate({ id: collectionId! });
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

  if (!data) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-2xl font-bold mb-2">Collection not found</h2>
          <Link href="/collections">
            <Button>Back to Collections</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { collection, swipes } = data;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/collections">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Collections
          </Button>
        </Link>

        <div className="flex items-start gap-3">
          <FolderOpen className="h-8 w-8 text-primary mt-1" />
          <div>
            <h1 className="text-3xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="text-muted-foreground mt-1">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {swipes.length} {swipes.length === 1 ? 'swipe' : 'swipes'}
            </p>
          </div>
        </div>
      </div>

      {swipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Mail className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No swipes in this collection</h2>
          <p className="text-muted-foreground mb-6">
            Add swipes to this collection from the swipes page
          </p>
          <Link href="/swipes">
            <Button>Browse Swipes</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {swipes.map((swipe) => {
            const classification = swipe.aiClassification as any;

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
                      {classification.use_case && (
                        <Badge variant="secondary">
                          {classification.use_case}
                        </Badge>
                      )}
                      {classification.niche && (
                        <Badge variant="outline">
                          {classification.niche}
                        </Badge>
                      )}
                      {classification.techniques?.slice(0, 2).map((technique: string) => (
                        <Badge key={technique} variant="secondary">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
