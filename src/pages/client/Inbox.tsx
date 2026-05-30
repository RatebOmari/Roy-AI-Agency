import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationPane } from "@/components/inbox/ConversationPane";
import {
  useConversations,
  useReplyToConversation,
  useGenerateReply,
  useInitiateCall,
  useInsertTemplateDraft,
  useUpdateConversationStatus,
  useSendManualMessage,
} from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation, Message } from "@/types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const replyMutation       = useReplyToConversation();
  const generateMutation    = useGenerateReply();
  const callMutation        = useInitiateCall();
  const insertDraftMutation = useInsertTemplateDraft();
  const updateStatusMutation = useUpdateConversationStatus();
  const sendManualMutation  = useSendManualMessage();

  // Local optimistic state
  const [localConvs, setLocalConvs] = useState<Conversation[] | null>(null);
  // SMS and phone_call are handled by the Phone page — exclude them here
  const displayed = (localConvs ?? conversations).filter(
    c => c.channel !== "sms" && c.channel !== "phone_call"
  );
  const selectedConv = displayed.find(c => c.id === selectedId) ?? null;

  // Reset local overrides whenever fresh server data arrives
  useEffect(() => {
    setLocalConvs(null);
  }, [conversations]);

  // Auto-select first conversation on desktop only.
  // Deps intentionally exclude selectedId — we don't re-select when the user
  // taps back (clears selection) on mobile.
  useEffect(() => {
    if (window.innerWidth < 1024) return;
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length]);

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
    updateStatusMutation.mutate({ id: convId, status: "resolved" });
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
    // Optimistically show the draft message in the thread immediately
    const draftMsg: Message = {
      id: "draft-" + Date.now(),
      conversationId: convId,
      direction: "outbound",
      content: text,
      aiReply: text,
      replyStatus: "pending",
      sentBy: "human",
      timestamp: new Date().toISOString(),
    };
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : { ...c, messages: [...c.messages, draftMsg] }
    ));
    insertDraftMutation.mutate({ conversationId: convId, content: text });
  };

  const handleSendManual = (convId: string, content: string) => {
    const sentMsg: Message = {
      id: "manual-" + Date.now(),
      conversationId: convId,
      direction: "outbound",
      content,
      replyStatus: "approved",
      sentBy: "human",
      timestamp: new Date().toISOString(),
    };
    setLocalConvs(prev => (prev ?? conversations).map(c =>
      c.id !== convId ? c : { ...c, messages: [...c.messages, sentMsg] }
    ));
    sendManualMutation.mutate({ conversationId: convId, content });
  };

  // On mobile: show list when nothing selected, show pane when selected
  const showList = !selectedId;
  const showPane = !!selectedId;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      {/* Full-height split pane that bleeds past the AppLayout padding */}
      <div className="flex h-[calc(100vh-56px)] -m-4 lg:-m-8 overflow-hidden border-t border-border">

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
            onSendManual={handleSendManual}
          />
        </div>
      </div>
    </AppLayout>
  );
}
