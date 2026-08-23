"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard } from "lucide-react";

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "⌘ K / Ctrl K", desc: "Open Command Palette" },
    { key: "G then O", desc: "Navigate to Overview" },
    { key: "G then S", desc: "Navigate to Services" },
    { key: "G then I", desc: "Navigate to Incidents" },
    { key: "G then L", desc: "Navigate to Logs Explorer" },
    { key: "G then M", desc: "Navigate to Metrics" },
    { key: "G then T", desc: "Navigate to Traces" },
    { key: "G then D", desc: "Navigate to Deployments" },
    { key: "?", desc: "Open Keyboard Shortcuts" },
    { key: "Esc", desc: "Close Modals" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-border/60">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2 text-xs">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border border-border font-semibold text-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useGlobalKeyboardNavigation({
  onOpenCommand,
  onOpenShortcuts,
}: {
  onOpenCommand: () => void;
  onOpenShortcuts: () => void;
}) {
  const router = useRouter();
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input, textarea, etc.
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Command + K or Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenCommand();
        return;
      }

      // ? for shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      const key = e.key.toLowerCase();
      const newSeq = [...keySequence, key].slice(-2);
      setKeySequence(newSeq);

      clearTimeout(timeout);
      timeout = setTimeout(() => setKeySequence([]), 1000);

      const seqStr = newSeq.join("");
      if (seqStr === "go") {
        router.push("/");
        setKeySequence([]);
      } else if (seqStr === "gs") {
        router.push("/services");
        setKeySequence([]);
      } else if (seqStr === "gi") {
        router.push("/incidents");
        setKeySequence([]);
      } else if (seqStr === "gl") {
        router.push("/logs");
        setKeySequence([]);
      } else if (seqStr === "gm") {
        router.push("/metrics");
        setKeySequence([]);
      } else if (seqStr === "gt") {
        router.push("/traces");
        setKeySequence([]);
      } else if (seqStr === "gd") {
        router.push("/deployments");
        setKeySequence([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [keySequence, onOpenCommand, onOpenShortcuts, router]);
}
