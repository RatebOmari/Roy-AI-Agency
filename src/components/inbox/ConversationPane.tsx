import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { useInternalNotes, useCreateNote, useDeleteNote } from "@/hooks/useTeam";
import {
  CheckCheck, X, Edit3, Send,
  Tag, Flag, AlertTriangle, CheckCircle2,
  AtSign, Smartphone, MessageCircle, MessageSquare, Phone,
  ArrowLeft, StickyNote, Trash2, Loader2, Plus,
} from "lucide-react";

interface ConversationPaneProps {
  conversation: Conversation | null;
  onApprove: (convId: string, messageId: string, content: string) => void;
  onReject:  (convId: string, messageId: string) => void;
  onEdit:    (convId: string, messageId: string, content: string) => void;
  onBack?:   () => void;   // mobile: go back to list
}

function ChannelBadge({ channel }: { channel: Conversation["channel"] }) {
  const map: Record<string, {
    label: string;
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = {
    instagram_dm:       { label: "Instagram DM", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400", icon: AtSign },
    instagram_comment:  { label: "Instagram",    className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400", icon: AtSign },
    tiktok_comment:     { label: "TikTok",       className: "bg-muted text-foreground",                                                   icon: MessageCircle },
    tiktok_dm:          { label: "TikTok DM",    className: "bg-muted text-foreground",                                                   icon: MessageCircle },
    facebook_comment:   { label: "Facebook",     className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",          icon: MessageSquare },
    facebook_messenger: { label: "Messenger",    className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",          icon: MessageSquare },
    whatsapp_business:  { label: "WhatsApp",     className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",      icon: Phone },
    sms:                { label: "SMS",          className: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",         icon: Smartphone },
    phone_call:         { label: "Call",         className: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",         icon: Phone },
  };
  const item = map[channel] ?? { label: channel, className: "bg-muted text-muted-foreground", icon: MessageSquare };
  const Icon = item.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", item.className)}>
      <Icon className="w-3 h-3" />
      {item.label}
    </span>
  );
}

function ConfidenceBanner({ confidence, status }: { confidence?: number; status?: Message["replyStatus"] }) {
  if (!confidence) return null;
  if (status === "approved" || status === "auto_sent" || status === "rejected") return null;

  if (confidence >= 0.85) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg text-xs text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>{Math.round(confidence * 100)}% confidence</strong> — AI reply queued for auto-send
        </span>
      </div>
    );
  }
  if (confidence >= 0.50) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
        <Flag className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>{Math.round(confidence * 100)}% confidence</strong> — Review before sending
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg text-xs text-red-700 dark:text-red-400">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        <strong>{Math.round(confidence * 100)}% confidence</strong> — Human review required
      </span>
    </div>
  );
}

function NotesPanel({ conversationId }: { conversationId: string }) {
  const { data: notes = [] } = useInternalNotes(conversationId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    createNote.mutate({ conversationId, content: text.trim(), authorName: "You" });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <StickyNote className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No internal notes yet</p>
            <p className="text-[11px] opacity-60 mt-1">Notes are only visible to your team</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{note.authorName}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => deleteNote.mutate(note.id)} className="hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-foreground leading-relaxed">{note.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border px-4 py-3 bg-card space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          placeholder="Add an internal note… (not visible to customer)"
          className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim() || createNote.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add Note
        </button>
      </div>
    </div>
  );
}

export function ConversationPane({ conversation, onApprove, onReject, onEdit, onBack }: ConversationPaneProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activePanel, setActivePanel] = useState<"messages" | "notes">("messages");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.id, conversation?.messages.length]);

  useEffect(() => {
    setEditingId(null);
    setEditContent("");
    setActivePanel("messages");
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">Select a conversation</p>
        <p className="text-xs mt-1 opacity-70">Choose one from the list to get started</p>
      </div>
    );
  }

  const pendingReply = conversation.messages.find(
    m => m.direction === "outbound" && m.replyStatus === "pending"
  );

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.aiReply ?? msg.content);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
        {/* Mobile back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">{conversation.contactName}</span>
            {conversation.priority === "urgent" && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ChannelBadge channel={conversation.channel} />
            <span className="text-xs text-muted-foreground">{conversation.contactHandle}</span>
          </div>
        </div>

        {/* Tags */}
        {conversation.tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            {conversation.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setActivePanel("messages")}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              activePanel === "messages" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Messages
          </button>
          <button
            onClick={() => setActivePanel("notes")}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
              activePanel === "notes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <StickyNote className="w-3 h-3" /> Notes
          </button>
        </div>
      </div>

      {/* Notes panel */}
      {activePanel === "notes" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <NotesPanel conversationId={conversation.id} />
        </div>
      )}

      {/* Messages */}
      {activePanel === "messages" && (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-3">
        {conversation.messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      )}

      {/* Reply actions — only in messages panel */}
      {activePanel === "messages" && pendingReply && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border px-4 sm:px-5 py-4 bg-card space-y-3"
          >
            <ConfidenceBanner confidence={pendingReply.aiConfidence} status={pendingReply.replyStatus} />

            {editingId === pendingReply.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { onEdit(conversation.id, pendingReply.id, editContent); setEditingId(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Edited
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-sm text-foreground">
                  <span className="text-primary flex-shrink-0 font-bold text-xs mt-0.5">AI</span>
                  <span className="leading-relaxed">{pendingReply.aiReply}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onApprove(conversation.id, pendingReply.id, pendingReply.aiReply ?? "")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Approve & Send
                  </button>
                  <button
                    onClick={() => startEdit(pendingReply)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => onReject(conversation.id, pendingReply.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-destructive text-sm font-medium rounded-xl hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {activePanel === "messages" && !pendingReply && (
        <div className="border-t border-border px-5 py-3 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Conversation handled
          </div>
        </div>
      )}
    </div>
  );
}
