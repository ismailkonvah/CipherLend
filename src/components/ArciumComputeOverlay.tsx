import { motion, AnimatePresence } from "framer-motion";

export function ArciumComputeOverlay({
  open,
  label = "Computing privately via Arcium…",
}: {
  open: boolean;
  label?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/80 backdrop-blur-sm"
        >
          <div className="text-center max-w-xs">
            <div className="label-eyebrow">Confidential compute</div>
            <div className="mt-3 font-serif text-2xl leading-snug">{label}</div>
            <div className="mt-4 mx-auto h-[2px] w-32 bg-border overflow-hidden">
              <motion.div
                className="h-full w-1/3 bg-accent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="mt-4 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              MPC · zero-exposure · verified
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
