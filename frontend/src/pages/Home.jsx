import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
const tileMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}

export default function Home() {
  return (
    <div className="relative flex min-h-[60vh] items-center">
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <motion.div {...tileMotion} transition={{ delay: 0.1 }} className="menu-tile">
          <h3>Start a new analysis</h3>
          <p>Launch a fresh trade intelligence run.</p>
          <Link className="tile-link" to="/new">Open</Link>
        </motion.div>
        <motion.div {...tileMotion} transition={{ delay: 0.2 }} className="menu-tile">
          <h3>Saved analysis</h3>
          <p>Resume previous analyses and reports.</p>
          <Link className="tile-link" to="/saved">Open</Link>
        </motion.div>
        <motion.div {...tileMotion} transition={{ delay: 0.3 }} className="menu-tile">
          <h3>Settings</h3>
          <p>Configure currencies, regions, and units.</p>
          <Link className="tile-link" to="/settings">Open</Link>
        </motion.div>
        <motion.div {...tileMotion} transition={{ delay: 0.4 }} className="menu-tile">
          <h3>How to use</h3>
          <p>Get guided walkthroughs and tips.</p>
          <Link className="tile-link" to="/how-to">Open</Link>
        </motion.div>
      </div>
    </div>
  )
}
