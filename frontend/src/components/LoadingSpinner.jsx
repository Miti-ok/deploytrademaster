import { motion } from 'framer-motion'

export default function LoadingSpinner({ label = 'Processing' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/70">
      <motion.div
        className="h-4 w-4 rounded-full border-2 border-ocean border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />
      <span>{label}</span>
    </div>
  )
}
