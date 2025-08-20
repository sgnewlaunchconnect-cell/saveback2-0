import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  RefreshCw,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GrabDetail {
  id: string;
  pin: string;
  status: string;
  expires_at: string;
  created_at: string;
  used_at?: string;
  user_id?: string;
  anon_user_id?: string;
  deal_id: string;
  deals?: {
    id: string;
    title: string;
  };
  users?: {
    display_name: string;
    email: string;
  };
}

interface GrabManagementProps {
  merchantId: string;
}

export default function GrabManagement({ merchantId }: GrabManagementProps) {
  const { toast } = useToast();
  const [grabs, setGrabs] = useState<GrabDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadGrabs();
  }, [merchantId]);

  const loadGrabs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grabs')
        .select(`
          id,
          pin,
          status,
          expires_at,
          created_at,
          used_at,
          user_id,
          anon_user_id,
          deal_id,
          deals(id, title),
          users(display_name, email)
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrabs((data as unknown as GrabDetail[]) || []);
    } catch (error) {
      console.error('Error loading grabs:', error);
      toast({
        title: "Error",
        description: "Failed to load grab details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'USED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'EXPIRED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'blue';
      case 'USED':
        return 'green';
      case 'EXPIRED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const filterGrabs = (status: string) => {
    if (status === 'active') {
      return grabs.filter(grab => grab.status === 'ACTIVE');
    } else if (status === 'used') {
      return grabs.filter(grab => grab.status === 'USED');
    } else {
      return grabs.filter(grab => grab.status === 'EXPIRED');
    }
  };

  const sendNotification = async () => {
    if (!notificationTitle || !notificationMessage) {
      toast({
        title: "Error",
        description: "Please fill in both title and message",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get unique user IDs who have grabbed from this merchant
      const userIds = Array.from(new Set(
        grabs
          .filter(grab => grab.user_id && grab.user_id !== '550e8400-e29b-41d4-a716-446655440000')
          .map(grab => grab.user_id!)
      ));

      if (userIds.length === 0) {
        toast({
          title: "No Recipients",
          description: "No registered users found to notify",
          variant: "destructive"
        });
        return;
      }

      // Send push notifications using the edge function
      const { data, error } = await supabase.functions.invoke('sendPushNotification', {
        body: {
          title: notificationTitle,
          message: notificationMessage,
          userIds: userIds,
          merchantId: merchantId
        }
      });

      if (error) throw error;

      toast({
        title: "Notifications Sent ✓",
        description: `Successfully sent to ${data?.data?.recipients || userIds.length} users`,
      });

      // Clear form
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive"
      });
    }
  };

  const renderGrabCard = (grab: GrabDetail) => (
    <Card key={grab.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(grab.status)}
              <Badge variant="outline" className={`text-${getStatusColor(grab.status)}-600`}>
                {grab.status}
              </Badge>
              <span className="text-sm font-medium">{grab.deals?.title || 'Deal'}</span>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3" />
                {grab.users?.display_name || grab.anon_user_id || 'Anonymous User'}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Created: {new Date(grab.created_at).toLocaleString()}
              </div>
              
              {grab.status === 'ACTIVE' && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Expires: {new Date(grab.expires_at).toLocaleString()}
                </div>
              )}
              
              {grab.used_at && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Used: {new Date(grab.used_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">PIN</div>
            <div className="font-mono text-sm font-bold">{grab.pin}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeGrabs = filterGrabs('active');
  const usedGrabs = filterGrabs('used');
  const expiredGrabs = filterGrabs('expired');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Grab Management</h2>
          <p className="text-muted-foreground">View customer grabs and send notifications</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadGrabs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Push Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Notification title..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Your message to customers..."
                    rows={3}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  This will be sent to all registered users who have grabbed your deals.
                </div>
                <Button onClick={sendNotification} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active ({activeGrabs.length})
          </TabsTrigger>
          <TabsTrigger value="used" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Used ({usedGrabs.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Expired ({expiredGrabs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeGrabs.length > 0 ? (
            <div className="space-y-3">
              {activeGrabs.map(renderGrabCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active grabs found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="used" className="space-y-4">
          {usedGrabs.length > 0 ? (
            <div className="space-y-3">
              {usedGrabs.map(renderGrabCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No used grabs found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredGrabs.length > 0 ? (
            <div className="space-y-3">
              {expiredGrabs.map(renderGrabCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No expired grabs found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{activeGrabs.length}</div>
              <div className="text-sm text-muted-foreground">Active Grabs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{usedGrabs.length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Array.from(new Set(grabs.filter(g => g.users?.display_name).map(g => g.user_id))).length}
              </div>
              <div className="text-sm text-muted-foreground">Unique Customers</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}