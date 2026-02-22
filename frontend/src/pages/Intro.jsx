import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Intro() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/home'), 1800)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-[70vh] items-center justify-center pt-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="text-center"
      >
        <motion.h1
          className="font-display text-6xl tracking-[0.26em] text-white sm:text-7xl md:text-8xl"
          animate={{
            textShadow: [
              '0 0 10px rgba(255,255,255,0.18), 0 0 24px rgba(0,123,255,0.2)',
              '0 0 16px rgba(255,255,255,0.3), 0 0 36px rgba(0,123,255,0.35)',
              '0 0 10px rgba(255,255,255,0.18), 0 0 24px rgba(0,123,255,0.2)'
            ],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          TRADEMASTER
        </motion.h1>
      </motion.div>
    </div>
  )
}
