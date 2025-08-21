import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Star, Eye, Check, X } from "lucide-react";
import { format } from "date-fns";

interface ReviewFlag {
  id: string;
  reason: string;
  status: string;
  admin_notes: string;
  created_at: string;
  resolved_at: string;
  review: {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    user: {
      email: string;
      display_name: string;
    } | null;
  } | null;
  merchant: {
    name: string;
  } | null;
}

export function AdminReviewFlags() {
  const [reviewFlags, setReviewFlags] = useState<ReviewFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ReviewFlag | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReviewFlags();
  }, []);

  const fetchReviewFlags = async () => {
    try {
      const { data, error } = await supabase
        .from("review_flags")
        .select(`
          *,
          review:reviews(
            id,
            rating,
            comment,
            created_at,
            user:users(email, display_name)
          ),
          merchant:merchants(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviewFlags(data as any || []);
    } catch (error) {
      console.error("Error fetching review flags:", error);
      toast({
        title: "Error",
        description: "Failed to fetch review flags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveFlag = async (flagId: string, action: "approve" | "reject", hideReview?: boolean) => {
    try {
      // Update flag status
      const { error: flagError } = await supabase
        .from("review_flags")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", flagId);

      if (flagError) throw flagError;

      // If rejecting and hiding review, update review
      if (action === "reject" && hideReview && selectedFlag) {
        const { error: reviewError } = await supabase
          .from("reviews")
          .update({
            is_hidden: true,
            hidden_reason: "Hidden due to merchant objection",
          })
          .eq("id", selectedFlag.review.id);

        if (reviewError) throw reviewError;
      }

      toast({
        title: "Success",
        description: `Review flag ${action}d successfully`,
      });

      setIsDialogOpen(false);
      setSelectedFlag(null);
      setAdminNotes("");
      fetchReviewFlags();
    } catch (error) {
      console.error("Error resolving flag:", error);
      toast({
        title: "Error",
        description: "Failed to resolve flag",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Review Flags</h2>
        <div className="animate-pulse">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Review Flags</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Review Flags ({reviewFlags.filter(f => f.status === "pending").length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-medium">{flag.merchant?.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        {renderStars(flag.review?.rating || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {flag.review?.comment}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {flag.review?.user?.display_name || flag.review?.user?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm">{flag.reason}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(flag.status)}>
                      {flag.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(flag.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedFlag(flag)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Flag Details</DialogTitle>
                          </DialogHeader>
                          {selectedFlag && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold">Original Review</h4>
                                <div className="border rounded p-3 space-y-2">
                                  <div className="flex items-center space-x-1">
                                    {renderStars(selectedFlag.review?.rating || 0)}
                                  </div>
                                  <p>{selectedFlag.review?.comment}</p>
                                  <p className="text-sm text-muted-foreground">
                                    by {selectedFlag.review?.user?.display_name || selectedFlag.review?.user?.email}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold">Merchant's Objection</h4>
                                <p className="text-sm">{selectedFlag.reason}</p>
                              </div>

                              <div>
                                <Label htmlFor="adminNotes">Admin Notes</Label>
                                <Textarea
                                  id="adminNotes"
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about your decision..."
                                />
                              </div>

                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => resolveFlag(selectedFlag.id, "approve")}
                                  className="flex-1"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve (Keep Review)
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => resolveFlag(selectedFlag.id, "reject", true)}
                                  className="flex-1"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject & Hide Review
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}