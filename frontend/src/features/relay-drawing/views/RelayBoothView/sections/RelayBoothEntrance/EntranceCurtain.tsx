import { motion } from 'motion/react'

export default function EntranceCurtain() {
  return (
    <motion.div
      className="absolute inset-0 z-10 bg-relay-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    />
  )
}
