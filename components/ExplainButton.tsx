"use client";

import { motion } from "framer-motion";
import { useChatBridge } from "./ChatContext";

export function ExplainButton({ prompt }: { prompt: string }) {
  const { sendToChat } = useChatBridge();
  return (
    <motion.button
      onClick={() => sendToChat(prompt)}
      animate={{
        boxShadow: [
          "0 0 0px rgba(255, 68, 31, 0)",
          "0 0 18px rgba(255, 68, 31, 0.45)",
          "0 0 0px rgba(255, 68, 31, 0)",
        ],
      }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-rappi-red/40 bg-rappi-red/10 px-3 py-1 text-xs font-medium text-rappi-red transition hover:border-rappi-red hover:bg-rappi-red/20"
    >
      ✨ Explicar con AI
    </motion.button>
  );
}
