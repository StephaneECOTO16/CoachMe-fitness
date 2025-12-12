"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedNameProps {
  prefix: string;
  name: string;
  suffix?: string;
  className?: string;
}

export const AnimatedName = ({
  prefix,
  name,
  suffix = "",
  className,
}: AnimatedNameProps) => {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-white drop-shadow-lg"
      >
        {prefix}
      </motion.span>

      <motion.span
        initial={{ y: -30, opacity: 0, filter: "blur(8px)", scale: 0.9 }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="relative inline-block overflow-hidden rounded-md bg-white/95 px-3 py-1 font-bold text-black shadow-lg backdrop-blur-sm"
      >
        {name}
      </motion.span>

      {suffix && (
        <motion.span
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          className="text-white drop-shadow-lg"
        >
          {suffix}
        </motion.span>
      )}
    </span>
  );
};

