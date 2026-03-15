import styles from './ApoiePage.module.css'
import { useState } from 'react' // Added missing import for useState
import { motion } from 'framer-motion' // Added missing import for motion

export function ApoiePage() {
  const [copied, setCopied] = useState(false)
  const pixKey = '59473e0c-fd1c-44dd-bca7-cd7f51e19d65'

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.container}>
      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.contentGrid}>
          <div className={styles.leftCol}>
            <h1 className={styles.title}>Apoie o Projeto</h1>
            
            <p className={styles.description}>
              O <strong>Warface Desafios</strong> é um projeto independente criado para fortalecer a nossa comunidade. 
              Manter o site online e atualizado exige dedicação e recursos constantes.
            </p>
            
            <div className={styles.reinvestCard}>
               <p><strong>100%</strong> das doações são revertidas para a <strong>manutenção do servidor</strong> e o desenvolvimento de <strong>melhorias exclusivas</strong> no site.</p>
            </div>
            <div className={styles.devSection}>
              <span className={styles.devLabel}>CRIADO POR</span>
              <img 
                src="/media/site/ajude_o_projeto/desenvolvido_por.png" 
                alt="Desenvolvedor" 
                className={styles.devBadge} 
              />
              <span className={styles.devName}>Italo França</span>
              
              <div className={styles.socialActions}>
                <a href="https://www.linkedin.com/in/italo-fran%C3%A7a-62464b1a4/" target="_blank" rel="noreferrer" className={styles.socialBtn} title="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
                <a href="https://github.com/italommf" target="_blank" rel="noreferrer" className={styles.socialBtn} title="GitHub">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                </a>
                <a href="https://steamcommunity.com/id/italommf/" target="_blank" rel="noreferrer" className={styles.socialBtn} title="Steam">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.385 0 0 5.385 0 12c0 3.308 1.342 6.302 3.518 8.47l4.908-2.006c.105-.333.303-.63.57-.86.136-.118.287-.216.447-.294A1.332 1.332 0 0 1 10.667 16a1.333 1.333 0 0 1 1.333 1.333c0 .354-.14.673-.365.91-.078.16-.176.31-.293.447a1.328 1.328 0 0 1-.861.571L8.474 24.19c2.168 2.176 5.162 3.518 8.47 3.518 6.615 0 12-5.385 12-12S23.385 0 16.944 0H12zm0 .8a11.2 11.2 0 0 1 11.2 11.2 11.2 11.2 0 0 1-11.2 11.2 11.2 11.2 0 0 1-8.31-3.714l4.576-1.87c.338.455.88.75 1.49.75 1.03 0 1.867-.837 1.867-1.867A1.867 1.867 0 0 0 9.4 14.533L7.53 9.96A11.218 11.218 0 0 1 12 .8zm-1.333 15.2c.442 0 .8.358.8.8s-.358.8-.8.8-.8-.358-.8-.8.358-.8.8-.8z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.supportOptions}>
              <div className={styles.donateCard}>
                <div className={styles.pixHeader}>
                   <div className={styles.pixIconCircle}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                   </div>
                   <h3>CONTRIBUA VIA PIX</h3>
                </div>

                <p className={styles.anyAmountNote}>
                  Qualquer valor, por menor que seja, ajuda imensamente a manter o projeto vivo e sem anúncios pesados.
                </p>

                <div className={styles.qrCodeWrapper}>
                   <img src="/media/site/ajude_o_projeto/qr_pix.png" alt="QR Code PIX" className={styles.qrCode} />
                </div>

                <div className={`${styles.pixKeyBox} ${copied ? styles.copied : ''}`} onClick={handleCopy}>
                  <span className={styles.pixKey}>{pixKey}</span>
                  <button className={styles.copyBtnIcon} title="Copiar Chave">
                    {copied ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                </div>
                
                <span className={styles.pixHint}>Clique na chave acima para copiar</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
