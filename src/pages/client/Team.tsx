import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from "@/hooks/useTeam";
import type { TeamMember, TeamRole, TeamMemberStatus } from "@/types";
import {
  UserPlus,
  Users,
  ChevronDown,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  Send,
  Shield,
} from "lucide-react";

const ROLE_BADGE: Record<TeamRole, string> = {
  admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  agent: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  viewer: "bg-muted text-muted-foreground",
};

const ROLE_AVATAR: Record<TeamRole, string> = {
  admin: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  agent: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  viewer: "bg-muted text-muted-foreground",
};

const STATUS_BADGE: Record<
  TeamMemberStatus,
  { cls: string; icon: React.ElementType; label: string }
> = {
  active: {
    cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    icon: CheckCircle2,
    label: "Active",
  },
  invited: {
    cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    icon: Clock,
    label: "Invited",
  },
  disabled: {
    cls: "bg-muted text-muted-foreground",
    icon: X,
    label: "Disabled",
  },
};

const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  admin: ["Full access", "Manage team", "All conversations"],
  agent: ["View & reply to conversations", "Use templates"],
  viewer: ["View conversations only", "No reply access"],
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  admin:
    "Can manage the team, change settings, and handle all conversations across all platforms.",
  agent:
    "Can view and reply to conversations and use saved templates. Cannot manage team or settings.",
  viewer:
    "Read-only access. Can browse conversations but cannot reply or make any changes.",
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface InviteDialogProps {
  onClose: () => void;
  onInvite: (name: string, email: string, role: TeamRole) => void;
}

function InviteDialog({ onClose, onInvite }: InviteDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("agent");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onInvite(name.trim(), email.trim(), role);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-foreground mb-1">Invite sent!</p>
              <p className="text-sm text-muted-foreground">
                An invitation was sent to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sara Al-Ahmad"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sara@yourbusiness.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamRole)}
                    className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Role description */}
              <div className="px-3 py-2.5 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !email.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleInvite = (name: string, email: string, role: TeamRole) => {
    createMember.mutate({ name, email, role, status: "invited" as TeamMemberStatus });
  };

  const handleRoleChange = (member: TeamMember, role: TeamRole) => {
    updateMember.mutate({ id: member.id, role });
  };

  const handleDelete = (id: string) => {
    deleteMember.mutate(id);
    setConfirmDelete(null);
  };

  const handleResendInvite = (member: TeamMember) => {
    // In a real app, this would trigger a resend API call
    updateMember.mutate({ id: member.id, status: "invited" });
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage who can access and respond to conversations
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {/* Current user card */}
        <div className="flex items-center gap-4 px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
            {user?.name ? getInitials(user.name) : "ME"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground text-sm">{user?.name ?? "You"}</p>
              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                Owner
              </span>
              <span className="text-xs text-muted-foreground">(You)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Full Access</span>
          </div>
        </div>

        {/* Team members list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Team Members</h3>
            {members.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {members.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invite your first team member to get started.
              </p>
              <button
                onClick={() => setInviteOpen(true)}
                className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Invite Member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => {
                const statusInfo = STATUS_BADGE[member.status];
                const StatusIcon = statusInfo.icon;
                const permissions = ROLE_PERMISSIONS[member.role];
                const isSelf = user?.email === member.email;

                return (
                  <div key={member.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full font-semibold text-sm flex items-center justify-center shrink-0 ${ROLE_AVATAR[member.role]}`}
                      >
                        {getInitials(member.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-foreground text-sm">{member.name}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[member.role]}`}
                          >
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.cls}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{member.email}</p>

                        {/* Permissions */}
                        <div className="flex flex-wrap gap-1.5">
                          {permissions.map((perm) => (
                            <span
                              key={perm}
                              className="text-[10px] px-1.5 py-0.5 bg-muted/70 text-muted-foreground rounded"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Resend invite */}
                        {member.status === "invited" && (
                          <button
                            onClick={() => handleResendInvite(member)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Resend
                          </button>
                        )}

                        {/* Role dropdown */}
                        {!isSelf && (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member, e.target.value as TeamRole)
                              }
                              className="appearance-none pl-2.5 pr-7 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                            >
                              <option value="admin">Admin</option>
                              <option value="agent">Agent</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                          </div>
                        )}

                        {/* Delete */}
                        {!isSelf && (
                          <>
                            {confirmDelete === member.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(member.id)}
                                  className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Remove
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(member.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role guide */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Role Permissions Guide</h3>
          <div className="space-y-3">
            {(["admin", "agent", "viewer"] as TeamRole[]).map((role) => (
              <div key={role} className="flex items-start gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${ROLE_BADGE[role]}`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PERMISSIONS[role].map((perm) => (
                    <span
                      key={perm}
                      className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite dialog */}
      {inviteOpen && (
        <InviteDialog onClose={() => setInviteOpen(false)} onInvite={handleInvite} />
      )}
    </AppLayout>
  );
}
