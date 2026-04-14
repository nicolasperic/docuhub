"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Team { id: string; name: string }
interface Role { id: string; name: string }

interface Member {
  id: string;
  name: string | null;
  email: string;
  orgRole: string;
  teamMembers: { team: Team }[];
  userRoles: { role: Role }[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Add member form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newOrgRole, setNewOrgRole] = useState("MEMBER");

  // Edit member form
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [editOrgRole, setEditOrgRole] = useState("MEMBER");

  async function load() {
    const [membersRes, teamsRes, rolesRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/teams"),
      fetch("/api/roles"),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (teamsRes.ok) setTeams(await teamsRes.json());
    if (rolesRes.ok) setRoles(await rolesRes.json());
  }

  useEffect(() => { load(); }, []);

  async function onAddMember(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, orgRole: newOrgRole }),
    });
    if (res.ok) {
      toast.success("Member added");
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewOrgRole("MEMBER");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  }

  function openEditMember(member: Member) {
    setEditingMember(member);
    setSelectedTeams(member.teamMembers.map((tm) => tm.team.id));
    setSelectedRoles(member.userRoles.map((ur) => ur.role.id));
    setEditOrgRole(member.orgRole);
    setEditOpen(true);
  }

  async function onEditMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;

    const res = await fetch(`/api/members/${editingMember.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds: selectedTeams, roleIds: selectedRoles, orgRole: editOrgRole }),
    });

    if (res.ok) {
      toast.success("Member updated");
      setEditOpen(false);
      load();
    } else {
      toast.error("Failed to update member");
    }
  }

  async function onRemove(id: string) {
    if (!confirm("Remove this member from the organization?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Member removed");
      load();
    }
  }

  function toggleSelection(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage organization members, team and role assignments</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={onAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Organization Role</Label>
                <Select value={newOrgRole} onValueChange={setNewOrgRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Member</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit member dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingMember?.name || "Member"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditMember} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Role</Label>
              <Select value={editOrgRole} onValueChange={setEditOrgRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teams</Label>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => (
                  <Badge
                    key={team.id}
                    variant={selectedTeams.includes(team.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTeams(toggleSelection(selectedTeams, team.id))}
                  >
                    {team.name}
                  </Badge>
                ))}
                {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams created yet</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant={selectedRoles.includes(role.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedRoles(toggleSelection(selectedRoles, role.id))}
                  >
                    {role.name}
                  </Badge>
                ))}
                {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles created yet</p>}
              </div>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Org Role</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name || "—"}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge variant={member.orgRole === "OWNER" ? "default" : "secondary"}>
                  {member.orgRole}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.teamMembers.map((tm) => (
                    <Badge key={tm.team.id} variant="outline" className="text-xs">
                      {tm.team.name}
                    </Badge>
                  ))}
                  {member.teamMembers.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.userRoles.map((ur) => (
                    <Badge key={ur.role.id} variant="outline" className="text-xs">
                      {ur.role.name}
                    </Badge>
                  ))}
                  {member.userRoles.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditMember(member)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRemove(member.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No members yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
