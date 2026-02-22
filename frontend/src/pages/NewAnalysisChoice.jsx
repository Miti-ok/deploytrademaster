import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function NewAnalysisChoice() {
  return (
    <div className="flex min-h-[60vh] items-center">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 lg:flex-row lg:justify-center">
        <motion.div
          className="choice-tile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="choice-glow" />
          <h3>Upload photo</h3>
          <p>Scan labels and packaging to auto-fill details.</p>
          <Link className="tile-link" to="/image-analyzer">
            Select image
          </Link>
        </motion.div>
        <motion.div
          className="choice-tile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="choice-glow" />
          <h3>Enter details manually</h3>
          <p>Provide product specs, materials, and destination.</p>
          <Link className="tile-link" to="/analysis">
            Continue
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
