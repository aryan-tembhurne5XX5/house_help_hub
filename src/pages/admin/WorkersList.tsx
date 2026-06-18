import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllWorkers, verifyWorker, blockWorker } from "@/utils/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/dateUtils";

interface Worker {
  worker_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_verified: number;
  is_blocked: number;
  created_at: string;
}

export default function WorkersList() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: workers, isLoading } = useQuery({
    queryKey: ['allWorkers'],
    queryFn: async () => {
      const response = await getAllWorkers();
      return response.data as Worker[];
    }
  });

  const handleVerify = async (id: number) => {
    setProcessingId(id);
    try {
      await verifyWorker(id);
      toast.success("Worker verified successfully");
      queryClient.invalidateQueries({ queryKey: ['allWorkers'] });
    } catch (error) {
      console.error("Error verifying worker:", error);
      toast.error("Failed to verify worker");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBlock = async (id: number, currentBlocked: number) => {
    setProcessingId(id);
    const newStatus = currentBlocked === 1 ? false : true;
    try {
      await blockWorker(id, newStatus);
      toast.success(`Worker ${newStatus ? 'blocked' : 'unblocked'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['allWorkers'] });
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast.error("Failed to change worker status");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Workers</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>All Platform Workers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !workers || workers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No workers found on the platform.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker.worker_id}>
                        <TableCell>#{worker.worker_id}</TableCell>
                        <TableCell className="font-medium">{worker.first_name} {worker.last_name}</TableCell>
                        <TableCell>{worker.email}</TableCell>
                        <TableCell>{formatDate(worker.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-col sm:flex-row">
                            {worker.is_verified ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>
                            )}
                            {worker.is_blocked === 1 && (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!worker.is_verified && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleVerify(worker.worker_id)}
                                disabled={processingId === worker.worker_id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                              >
                                {processingId === worker.worker_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Verify
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant={worker.is_blocked ? "outline" : "ghost"}
                              onClick={() => handleToggleBlock(worker.worker_id, worker.is_blocked)}
                              disabled={processingId === worker.worker_id}
                              className={worker.is_blocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                            >
                              {processingId === worker.worker_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : worker.is_blocked ? (
                                <><ShieldCheck className="h-4 w-4 mr-1" /> Unblock</>
                              ) : (
                                <><ShieldAlert className="h-4 w-4 mr-1" /> Block</>
                              )}
                            </Button>
                          </div>
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
