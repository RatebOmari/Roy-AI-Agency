import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationPane } from "@/components/inbox/ConversationPane";
import { useConversations, useReplyToConversation, useGenerateReply, useInitiateCall, useInsertTemplateDraft } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const replyMutation    = useReplyToConversation();
  const generateMutation = useGenerateReply();
  const callMutation     = useInitiateCall();
  const insertDraftMutation = useInsertTemplateDraft();

  // Local optimistic state
  const [localConvs, setLocalConvs] = useState<Conversation[] | null>(null);
  const displayed = localConvs ?? conversations;
  const selectedConv = displayed.find(c => c.id === selectedId) ?? null;

  // Auto-select first conversation on load (desktop UX)
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleResolve = (convId: string) => {
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : { ...c, status: "resolved" as const }
    ));
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

  const handleInsertTemplate = (convId: string, text: string) => {
    insertDraftMutation.mutate({ conversationId: convId, content: text });
  };

  // On mobile: show list when nothing selected, show pane when selected
  const showList = !selectedId;
  const showPane = !!selectedId;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      {/* Full-height split pane that bleeds past the AppLayout padding */}
      <div className="flex h-[calc(100vh-56px)] -m-6 lg:-m-8 overflow-hidden border-t border-border">

        {/* Left panel — full width on mobile (list only), fixed 320px on desktop */}
        <div className={cn(
          "flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden",
          "w-full lg:w-80",
          showList  ? "flex"        : "hidden lg:flex",
        )}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConversationList
              conversations={displayed}
              selectedId={selectedId}
              onSelect={id => {
                setSelectedId(id);
                setLocalConvs(prev => (prev ?? conversations).map(c =>
                  c.id !== id ? c : { ...c, unreadCount: 0 }
                ));
              }}
              search={search}
              onSearchChange={setSearch}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
            />
          )}
        </div>

        {/* Right panel — hidden on mobile until conversation selected */}
        <div className={cn(
          "flex-1 flex-col bg-background overflow-hidden",
          showPane ? "flex" : "hidden lg:flex",
        )}>
          <ConversationPane
            conversation={selectedConv}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            onResolve={handleResolve}
            onGenerateReply={convId => generateMutation.mutate(convId)}
            isGenerating={generateMutation.isPending}
            onBack={() => setSelectedId(null)}
            onCall={convId => callMutation.mutate(convId)}
            isCalling={callMutation.isPending}
            onInsertTemplate={handleInsertTemplate}
          />
        </div>
      </div>
    </AppLayout>
  );
}
