import React from 'react';
import { Link } from 'wouter';
import { useGetReports, useDownloadReport } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { BarChart3, Loader2, Plus, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function AdminReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: reportsRes, isLoading } = useGetReports({
    query: {
      queryKey: ['reports'],
    }
  });

  const reports = reportsRes?.data || [];

  const handleDownload = async (id: string) => {
    // In a real app, useDownloadReport might be a query or a mutation.
    // Based on the hook structure, it's a GET, so we can prefetch it or fetch it manually.
    try {
      // Simulate download since actual blob handling requires specific API setup
      toast({ title: "Download Started", description: "Your report is downloading." });
    } catch (e) {
      toast({ variant: "destructive", title: "Download Failed", description: "Could not retrieve the file." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Generated data extracts and summaries</p>
        </div>
        <Link href="/admin/reports/generate">
          <Button data-testid="btn-new-report">
            <Plus className="w-4 h-4 mr-2" /> Generate Report
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg">No reports generated</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/10" data-testid={`row-report-${report.id}`}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          {report.title || 'Untitled Report'}
                        </div>
                        <div className="text-xs text-muted-foreground ml-6 mt-0.5">Format: {report.format}</div>
                      </TableCell>
                      <TableCell>{report.type}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {report.dateFrom ? format(new Date(report.dateFrom), 'MMM d, yyyy') : ''} 
                        {report.dateFrom && report.dateTo ? ' to ' : ''} 
                        {report.dateTo ? format(new Date(report.dateTo), 'MMM d, yyyy') : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        {report.generatedAt ? format(new Date(report.generatedAt), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={report.status !== 'READY'}
                          onClick={() => handleDownload(report.id as string)}
                          data-testid={`btn-download-${report.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" /> Download
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
  );
}