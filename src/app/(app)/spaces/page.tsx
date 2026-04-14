"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FolderOpen, Globe, Users, Briefcase, User } from "lucide-react";
import { toast } from "sonner";

const spaceTypeIcons = {
  ORG_WIDE: Globe,
  TEAM: Users,
  CLIENT: Briefcase,
  PERSONAL: User,
};

const spaceTypeLabels = {
  ORG_WIDE: "Organization-wide",
  TEAM: "Team",
  CLIENT: "Client",
  PERSONAL: "Personal",
};

interface Space {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  type: keyof typeof spaceTypeIcons;
  team: { name: string } | null;
  _count: { documents: number };
}

interface Team {
  id: string;
  name: string;
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("ORG_WIDE");
  const [teamId, setTeamId] = useState("");

  async function load() {
    const [spacesRes, teamsRes] = await Promise.all([
      fetch("/api/spaces"),
      fetch("/api/teams"),
    ]);
    if (spacesRes.ok) setSpaces(await spacesRes.json());
    if (teamsRes.ok) setTeams(await teamsRes.json());
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        type,
        teamId: type === "TEAM" ? teamId : null,
      }),
    });

    if (res.ok) {
      toast.success("Space created");
      setOpen(false);
      setName("");
      setDescription("");
      setType("ORG_WIDE");
      setTeamId("");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spaces</h1>
          <p className="text-muted-foreground">Documentation spaces in your organization</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Space
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Space</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORG_WIDE">Organization-wide</SelectItem>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "TEAM" && (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">Create Space</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space) => {
          const Icon = spaceTypeIcons[space.type];
          return (
            <Link key={space.id} href={`/spaces/${space.slug}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{space.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {spaceTypeLabels[space.type]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {space.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    {space._count.documents} document{space._count.documents !== 1 ? "s" : ""}
                    {space.team && (
                      <>
                        <span>&middot;</span>
                        <Users className="h-3 w-3" />
                        {space.team.name}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {spaces.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FolderOpen className="mx-auto mb-2 h-8 w-8" />
            <p>No spaces yet. Create one to start organizing documentation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
