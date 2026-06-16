
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  getUserNotifications, 
  getWorkerNotifications, 
  markNotificationRead,
  markAllUserNotificationsRead,
  markAllWorkerNotificationsRead
} from "@/utils/api";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export function NotificationBell({ userType, userId }: { userType: 'user' | 'worker', userId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const response = userType === 'user' 
        ? await getUserNotifications(userId)
        : await getWorkerNotifications(userId);
      
      const data = response.data;
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => n.is_read === 0).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, userType]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n.notification_id === id ? { ...n, is_read: 1 } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (userType === 'user') {
        await markAllUserNotificationsRead(userId);
      } else {
        await markAllWorkerNotificationsRead(userId);
      }
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 mr-4" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs font-normal" onClick={(e) => {
              e.preventDefault();
              handleMarkAllAsRead();
            }}>
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.notification_id} 
                className={`flex flex-col items-start p-3 cursor-pointer ${notification.is_read === 0 ? 'bg-blue-50/50' : ''}`}
                onClick={() => notification.is_read === 0 && handleMarkAsRead(notification.notification_id)}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className={`font-medium text-sm ${notification.is_read === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {notification.title}
                  </span>
                  {notification.is_read === 0 && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                  )}
                </div>
                <p className={`text-xs ${notification.is_read === 0 ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                  {notification.message}
                </p>
                <span className="text-[10px] text-gray-400 mt-1 block w-full text-right">
                  {formatTime(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
