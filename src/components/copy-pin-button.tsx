"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyPinButton({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 text-gray-400 hover:text-indigo-600 transition"
      title="Copy PIN"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
