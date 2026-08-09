import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGenerateReport } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Play, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  type: z.enum(['FINANCIAL', 'MEMBERSHIP', 'TRIPS', 'VEHICLES']),
  format: z.enum(['PDF', 'CSV', 'EXCEL']),
  dateFrom: z.string().min(1, 'Start date is required'),
  dateTo: z.string().min(1, 'End date is required'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function AdminReportGenerate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const generateMutation = useGenerateReport();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: 'FINANCIAL',
      format: 'PDF',
      dateFrom: '',
      dateTo: '',
    }
  });

  const onSubmit = (data: ReportFormValues) => {
    // Format dates to ISO if needed
    const submitData = {
      ...data,
      dateFrom: new Date(data.dateFrom).toISOString(),
      dateTo: new Date(data.dateTo).toISOString()
    };
    
    generateMutation.mutate({ data: submitData }, {
      onSuccess: () => {
        toast({ title: "Report Generation Started", description: "The report is being processed. It will appear in the reports list shortly." });
        setLocation('/admin/reports');
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/admin/reports')} data-testid="btn-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Report</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Report Parameters
          </CardTitle>
          <CardDescription>Select the data set, timeframe, and output format for your report.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Set / Report Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FINANCIAL">Financial (Payments & Revenue)</SelectItem>
                          <SelectItem value="MEMBERSHIP">Membership Roster</SelectItem>
                          <SelectItem value="TRIPS">Trips & Operations</SelectItem>
                          <SelectItem value="VEHICLES">Fleet Status</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Output Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-format">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PDF">PDF Document (.pdf)</SelectItem>
                          <SelectItem value="CSV">Comma Separated (.csv)</SelectItem>
                          <SelectItem value="EXCEL">Excel Spreadsheet (.xlsx)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date To</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={generateMutation.isPending}
                  data-testid="btn-submit-generate"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Run Generator</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}