import { getCurrentUserId } from "@/utils/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAllUsers, deleteUser, blockUser } from "@/utils/api";
import { Loader2, Trash2, Ban, UserCheck } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

export default function UsersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Check admin auth
  const adminId = getCurrentUserId();
  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const response = await getAllUsers();
      return response.data;
    },
    enabled: !!adminId,
  });

  const handleBlock = async (userId: number, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;
    
    setProcessingId(userId);
    try {
      await blockUser(userId, !currentStatus);
      toast.success(`User ${currentStatus ? 'unblocked' : 'blocked'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update user status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm("Are you sure you want to completely delete this user? This action cannot be undone.")) return;
    
    setProcessingId(userId);
    try {
      await deleteUser(userId);
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Platform Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : !users || users.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">#{user.user_id}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          {user.is_blocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant={user.is_blocked ? "outline" : "secondary"} 
                            size="sm"
                            disabled={processingId === user.user_id}
                            onClick={() => handleBlock(user.user_id, user.is_blocked)}
                          >
                            {processingId === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : user.is_blocked ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={processingId === user.user_id}
                            onClick={() => handleDelete(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
