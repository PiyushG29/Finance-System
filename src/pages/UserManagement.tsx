import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, IndianRupee, LogOut, Shield, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { listAdminUsers, updateUserRole, updateUserStatus, type AppRole, type UserWithRole } from "@/lib/backendApi";

export default function UserManagement() {
  const { user, role, loading, signOut, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
    enabled: isAdmin,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; roleId: string; newRole: AppRole }) => {
      await updateUserRole(userId, newRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await updateUserStatus(userId, newStatus as "active" | "inactive");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">Finance Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize">{role ?? "loading"}</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.username || u.email || "—"}</TableCell>
                        <TableCell>{u.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.status === "active" ? "default" : "secondary"} className="capitalize">
                            {u.status}
                          </Badge>
                         </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.status === "active"}
                            onCheckedChange={() =>
                              toggleStatus.mutate({ userId: u.user_id, currentStatus: u.status })
                            }
                            disabled={u.user_id === user.id}
                          />
                        </TableCell>
                         <TableCell className="text-muted-foreground text-sm">
                           {new Date(u.created_at).toLocaleDateString()}
                         </TableCell>
                         <TableCell>
                           <Select
                             value={u.role}
                             onValueChange={(val) =>
                               updateRole.mutate({ userId: u.user_id, roleId: u.role_id, newRole: val as AppRole })
                             }
                             disabled={u.user_id === user.id}
                           >
                             <SelectTrigger className="w-[130px]">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="viewer">
                                 <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Viewer</span>
                               </SelectItem>
                               <SelectItem value="analyst">
                                 <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Analyst</span>
                               </SelectItem>
                               <SelectItem value="admin">
                                 <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>
                               </SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                       </TableRow>
                     ))}
                     {users.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                           No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
