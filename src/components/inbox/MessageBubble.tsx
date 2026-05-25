import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { Bot, User, CheckCheck, Clock, AlertCircle } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

const confidenceColor = (score?: number) => {
  if (!score) return "";
  if (score >= 0.85) return "text-green-600";
  if (score >= 0.50) return "text-yellow-600";
  return "text-red-600";
};

const confidenceLabel = (score?: number) => {
  if (!score) return "";
  if (score >= 0.85) return "Auto-send";
  if (score >= 0.50) return "Review";
  return "Escalate";
};

const statusIcon = (status?: string) => {
  if (status === "auto_sent" || status === "approved") return <CheckCheck className="w-3.5 h-3.5 text-green-500" />;
  if (status === "pending") return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
  if (status === "rejected") return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  return null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isInbound = message.direction === "inbound";

  return (
    <div className={cn("flex gap-2.5 max-w-[80%]", isInbound ? "self-start" : "self-end flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
        isInbound ? "bg-muted" : "bg-primary/10"
      )}>
        {isInbound ? <User className="w-4 h-4 text-muted-foreground" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>

      <div className="flex flex-col gap-1">
        {/* Bubble */}
        <div className={cn(
          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
          isInbound
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-white rounded-tr-sm"
        )}>
          {message.content}
        </div>

        {/* Meta row */}
        <div className={cn("flex items-center gap-2 px-1", isInbound ? "" : "flex-row-reverse")}>
          <span className="text-[11px] text-muted-foreground">{formatTime(message.timestamp)}</span>
          {!isInbound && message.aiConfidence !== undefined && (
            <span className={cn("text-[11px] font-medium", confidenceColor(message.aiConfidence))}>
              {Math.round(message.aiConfidence * 100)}% · {confidenceLabel(message.aiConfidence)}
            </span>
          )}
          {!isInbound && statusIcon(message.replyStatus)}
        </div>
      </div>
    </div>
  );
}
