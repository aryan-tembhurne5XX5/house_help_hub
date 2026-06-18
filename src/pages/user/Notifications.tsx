import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { 
  getUserNotifications, 
  getWorkerNotifications,
  markNotificationRead,
  markAllUserNotificationsRead,
  markAllWorkerNotificationsRead
} from "@/utils/api";
import { isAuthenticated, getCurrentRole, getCurrentUserId } from "@/utils/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const role = getCurrentRole();
  const userId = getCurrentUserId();

  useEffect(() => {
    if (!isAuthenticated() || !userId) {
      navigate("/auth");
      return;
    }
    
    fetchNotifications();
  }, [navigate, userId, role]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = role === 'worker' 
        ? await getWorkerNotifications(userId)
        : await getUserNotifications(userId);
      
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n.notification_id === id ? { ...n, is_read: 1 } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (role === 'worker') {
        await markAllWorkerNotificationsRead(userId);
      } else {
        await markAllUserNotificationsRead(userId);
      }
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" /> Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground max-w-md">
                  You'll see updates about your bookings, messages, and account activity here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div 
                    key={notification.notification_id} 
                    className={`p-6 transition-colors ${notification.is_read === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {notification.is_read === 0 && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>
                          )}
                          <h4 className={`font-semibold ${notification.is_read === 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                            {notification.title}
                          </h4>
                        </div>
                        <p className={`text-sm ${notification.is_read === 0 ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {notification.is_read === 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs shrink-0" 
                          onClick={() => handleMarkAsRead(notification.notification_id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
