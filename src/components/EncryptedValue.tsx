import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function EncryptedValue({
  value,
  allowReveal = true,
}: {
  value: string;
  allowReveal?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {revealed ? (
          <motion.span
            key="v"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-mono num"
          >
            {value}
          </motion.span>
        ) : (
          <motion.span
            key="h"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-mono tracking-[0.25em] text-muted-foreground"
          >
            ······
          </motion.span>
        )}
      </AnimatePresence>
      {allowReveal && (
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition"
          aria-label="Toggle private value"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );
}
