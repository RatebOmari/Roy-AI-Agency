import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationPane } from "@/components/inbox/ConversationPane";
import { useConversations, useReplyToConversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/types";
import { Loader2 } from "lucide-react";

export default function Inbox() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const replyMutation = useReplyToConversation();

  // Local optimistic state
  const [localConvs, setLocalConvs] = useState<Conversation[] | null>(null);
  const displayed = localConvs ?? conversations;
  const selectedConv = displayed.find(c => c.id === selectedId) ?? null;

  const handleApprove = (convId: string, msgId: string, content: string) => {
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : {
        ...c,
        unreadCount: 0,
        messages: c.messages.map(m =>
          m.id !== msgId ? m : { ...m, replyStatus: "approved" as const }
        ),
      }
    ));
    replyMutation.mutate({ conversationId: convId, content, action: "approve" });
  };

  const handleReject = (convId: string, msgId: string) => {
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : {
        ...c,
        messages: c.messages.map(m =>
          m.id !== msgId ? m : { ...m, replyStatus: "rejected" as const }
        ),
      }
    ));
    replyMutation.mutate({ conversationId: convId, content: "", action: "reject" });
  };

  const handleEdit = (convId: string, msgId: string, content: string) => {
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : {
        ...c,
        unreadCount: 0,
        messages: c.messages.map(m =>
          m.id !== msgId ? m : { ...m, content, aiReply: content, replyStatus: "edited" as const }
        ),
      }
    ));
    replyMutation.mutate({ conversationId: convId, content, action: "edit" });
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      {/* Full-height split pane that bleed past the AppLayout padding */}
      <div className="flex h-[calc(100vh-56px)] -m-6 lg:-m-8 overflow-hidden border-t border-border">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConversationList
              conversations={displayed}
              selectedId={selectedId}
              onSelect={setSelectedId}
              search={search}
              onSearchChange={setSearch}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          <ConversationPane
            conversation={selectedConv}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </AppLayout>
  );
}
