import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/DateRangePicker";
import { downloadCSV } from "@/utils/csvExport";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface Transaction {
  id: string;
  payment_code: string;
  status: string;
  original_amount: number;
  final_amount: number;
  credits_applied: number;
  discount_applied: number;
  created_at: string;
  captured_at: string;
  merchant: {
    name: string;
  };
  user: {
    email: string;
    display_name: string;
  } | null;
}

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [dateRange, statusFilter]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from("pending_transactions")
        .select(`
          *,
          merchant:merchants(name),
          user:users(email, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data as any || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "captured":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "voided":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.payment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.merchant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = () => {
    const exportData = filteredTransactions.map(t => ({
      payment_code: t.payment_code,
      merchant: t.merchant?.name || "",
      user_email: t.user?.email || "",
      user_name: t.user?.display_name || "",
      original_amount: (t.original_amount / 100).toFixed(2),
      final_amount: (t.final_amount / 100).toFixed(2),
      credits_applied: (t.credits_applied / 100).toFixed(2),
      discount_applied: (t.discount_applied / 100).toFixed(2),
      status: t.status,
      created_at: format(new Date(t.created_at), "yyyy-MM-dd HH:mm:ss"),
      captured_at: t.captured_at ? format(new Date(t.captured_at), "yyyy-MM-dd HH:mm:ss") : ""
    }));
    downloadCSV(exportData, `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by payment code, merchant, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="captured">Captured</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Code</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Original Amount</TableHead>
                <TableHead>Final Amount</TableHead>
                <TableHead>Credits Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono">{transaction.payment_code}</TableCell>
                  <TableCell>{transaction.merchant?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{transaction.user?.display_name || "-"}</div>
                      <div className="text-muted-foreground">{transaction.user?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>${(transaction.original_amount / 100).toFixed(2)}</TableCell>
                  <TableCell>${(transaction.final_amount / 100).toFixed(2)}</TableCell>
                  <TableCell>${(transaction.credits_applied / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
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