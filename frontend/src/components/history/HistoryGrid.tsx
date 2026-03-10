import { motion, AnimatePresence } from 'framer-motion'
import { useHistory } from '@/api/hooks'
import { HistoryCard } from './HistoryCard'
import styles from './HistoryGrid.module.css'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const cardVariants = {
  hidden:   { opacity: 0, y: 16 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function HistoryGrid() {
  const { data, isLoading, isError } = useHistory()

  if (isLoading) {
    return <p className={styles.empty}>Carregando...</p>
  }

  if (isError) {
    return <p className={styles.empty}>Erro ao conectar com o servidor.</p>
  }

  if (!data?.length) {
    return (
      <p className={styles.empty}>
        Nenhum banner salvo ainda.<br />
        Vá para Meus Desafios e salve seu primeiro banner!
      </p>
    )
  }

  return (
    <motion.div
      className={styles.grid}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {data.map((banner) => (
          <motion.div key={banner.id} variants={cardVariants}>
            <HistoryCard banner={banner} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
