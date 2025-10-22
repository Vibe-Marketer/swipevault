import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Mail, Calendar, ArrowLeft, Loader2, Tag, Lightbulb, Save } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface SwipeDetailProps {
  id: string;
}

export default function SwipeDetail({ id }: SwipeDetailProps) {
  const { data: swipe, isLoading } = trpc.swipes.get.useQuery({ id });
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");

  const toggleFavorite = trpc.swipes.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.swipes.get.invalidate({ id });
      utils.swipes.list.invalidate();
    },
  });

  const updateSwipe = trpc.swipes.update.useMutation({
    onSuccess: () => {
      utils.swipes.get.invalidate({ id });
      toast.success("Notes saved");
    },
  });

  const handleSaveNotes = () => {
    updateSwipe.mutate({ id, notes });
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

  if (!swipe) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Swipe not found</h2>
          <Link href="/">
            <Button className="mt-4">Back to Swipes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const classification = swipe.aiClassification as any;
  const insights = swipe.aiInsights as any;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Swipes
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Email Content */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{swipe.subject}</CardTitle>
                  <CardDescription className="mt-3 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {swipe.senderName || swipe.senderEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {swipe.receivedDate && format(new Date(swipe.receivedDate), "MMMM d, yyyy 'at' h:mm a")}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite.mutate({ id })}
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
              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="plain">Plain Text</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-4">
                  {swipe.htmlBody ? (
                    <div
                      className="prose prose-sm max-w-none border rounded-lg p-4 bg-background"
                      dangerouslySetInnerHTML={{ __html: swipe.htmlBody }}
                    />
                  ) : (
                    <p className="text-muted-foreground">No HTML content</p>
                  )}
                </TabsContent>
                <TabsContent value="plain" className="mt-4">
                  <div className="border rounded-lg p-4 bg-muted/30 whitespace-pre-wrap font-mono text-sm">
                    {swipe.plainBody || "No plain text content"}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
              <CardDescription>Add your own notes and observations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes || swipe.notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this swipe..."
                rows={4}
              />
              <Button onClick={handleSaveNotes} disabled={updateSwipe.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* AI Classification */}
          {classification && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  AI Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {classification.useCases && classification.useCases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Use Cases</h4>
                    <div className="flex flex-wrap gap-2">
                      {classification.useCases.map((tag: any) => (
                        <Badge key={tag.name} variant="secondary">
                          {tag.name}
                          <span className="ml-1 text-xs opacity-70">
                            {Math.round(tag.confidence)}%
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {classification.techniques && classification.techniques.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Techniques</h4>
                    <div className="flex flex-wrap gap-2">
                      {classification.techniques.map((tag: any) => (
                        <Badge key={tag.name} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {classification.niches && classification.niches.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Industry</h4>
                    <div className="flex flex-wrap gap-2">
                      {classification.niches.map((tag: any) => (
                        <Badge key={tag.name}>{tag.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{insights.summary}</p>
                  </div>
                )}

                {insights.headlineQuality && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Headline Quality</h4>
                    <p className="text-sm text-muted-foreground">{insights.headlineQuality}</p>
                  </div>
                )}

                {insights.ctaAnalysis && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">CTA Analysis</h4>
                    <p className="text-sm text-muted-foreground">{insights.ctaAnalysis}</p>
                  </div>
                )}

                {insights.keyTakeaways && insights.keyTakeaways.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Takeaways</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {insights.keyTakeaways.map((takeaway: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {takeaway}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

