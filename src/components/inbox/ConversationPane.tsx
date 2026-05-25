import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/types";
import { MessageBubble } from "./MessageBubble";
import {
  CheckCheck, X, Edit3, Send, ChevronDown,
  Tag, Flag, AlertTriangle, CheckCircle2,
  AtSign, Smartphone, MessageCircle, MessageSquare, Phone,
} from "lucide-react";

interface ConversationPaneProps {
  conversation: Conversation | null;
  onApprove: (convId: string, messageId: string, content: string) => void;
  onReject: (convId: string, messageId: string) => void;
  onEdit: (convId: string, messageId: string, content: string) => void;
}

function ChannelBadge({ channel }: { channel: Conversation["channel"] }) {
  const map: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
    instagram_dm:       { label: "Instagram DM",   className: "bg-purple-100 text-purple-700", icon: AtSign },
    instagram_comment:  { label: "Instagram",       className: "bg-purple-100 text-purple-700", icon: AtSign },
    tiktok_comment:     { label: "TikTok",          className: "bg-black/10 text-black",        icon: MessageCircle },
    tiktok_dm:          { label: "TikTok DM",       className: "bg-black/10 text-black",        icon: MessageCircle },
    facebook_comment:   { label: "Facebook",        className: "bg-blue-100 text-blue-700",     icon: MessageSquare },
    facebook_messenger: { label: "Messenger",       className: "bg-blue-100 text-blue-700",     icon: MessageSquare },
    whatsapp_business:  { label: "WhatsApp",        className: "bg-green-100 text-green-700",   icon: Phone },
    sms:                { label: "SMS",             className: "bg-slate-100 text-slate-700",   icon: Smartphone },
    phone_call:         { label: "Call",            className: "bg-slate-100 text-slate-700",   icon: Phone },
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
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span><strong>{Math.round(confidence * 100)}% confidence</strong> — AI reply queued for auto-send</span>
      </div>
    );
  }
  if (confidence >= 0.50) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
        <Flag className="w-3.5 h-3.5 flex-shrink-0" />
        <span><strong>{Math.round(confidence * 100)}% confidence</strong> — Review before sending</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span><strong>{Math.round(confidence * 100)}% confidence</strong> — Human review required</span>
    </div>
  );
}

export function ConversationPane({ conversation, onApprove, onReject, onEdit }: ConversationPaneProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.id, conversation?.messages.length]);

  useEffect(() => {
    setEditingId(null);
    setEditContent("");
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm">Select a conversation to get started</p>
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
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
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
          <div className="flex items-center gap-1">
            {conversation.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {conversation.messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Reply actions */}
      {pendingReply && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border px-5 py-4 bg-card space-y-3"
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
                <div className="flex gap-2">
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
                <div className="flex gap-2">
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

      {!pendingReply && (
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
