import { CheckCircle2, Flag, AlertTriangle } from "lucide-react";

interface ConfidenceBannerProps {
  confidence?: number;
}

export function ConfidenceBanner({ confidence }: ConfidenceBannerProps) {
  if (confidence == null) return null;

  if (confidence >= 0.85) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg text-xs text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>{Math.round(confidence * 100)}% confidence</strong> — Auto-sent
        </span>
      </div>
    );
  }
  if (confidence >= 0.50) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
        <Flag className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>{Math.round(confidence * 100)}% confidence</strong> — Review required
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg text-xs text-red-700 dark:text-red-400">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        <strong>{Math.round(confidence * 100)}% confidence</strong> — Escalation — human required
      </span>
    </div>
  );
}
