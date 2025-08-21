import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_transactions")
        .select(`
          *,
          merchant:merchants(name),
          user:users(email, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

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
      <h2 className="text-2xl font-bold">Transactions</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Transaction Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by payment code, merchant, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
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