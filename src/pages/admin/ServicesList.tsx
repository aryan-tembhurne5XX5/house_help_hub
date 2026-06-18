import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/utils/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Service {
  service_id: number;
  name: string;
  description: string;
  base_price: number;
  icon_name: string;
  category: string;
}

export default function ServicesList() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['allServices'],
    queryFn: async () => {
      const response = await getServices();
      return response.data as Service[];
    }
  });

  return (
    <Layout>
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Services</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Platform Service Categories</CardTitle>
            <CardDescription>View all available service categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !services || services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No services found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Base Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.service_id}>
                        <TableCell>#{service.service_id}</TableCell>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="capitalize">{service.category || "General"}</TableCell>
                        <TableCell className="max-w-md truncate">{service.description}</TableCell>
                        <TableCell>${parseFloat(service.base_price.toString()).toFixed(2)}</TableCell>
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
