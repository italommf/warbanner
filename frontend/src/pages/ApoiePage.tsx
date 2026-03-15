import styles from './ApoiePage.module.css'

export function ApoiePage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Apoie o Projeto</h1>
        <p className={styles.description}>
          O Warface Desafios é um projeto desenvolvido de forma independente para a comunidade. 
          Se você gosta da ferramenta e quer ajudar a mantê-la online e com novas atualizações, 
          considere fazer um apoio.
        </p>

        <div className={styles.devSection}>
          <span className={styles.devLabel}>DESENVOLVIDO POR</span>
          <div className={styles.devCard}>
            <img 
              src="/stats_badge.png" 
              alt="Desenvolvedor" 
              className={styles.devBadge} 
            />
            <div className={styles.devInfo}>
              <span className={styles.devName}>italommf</span>
              <div className={styles.socials}>
                {/* Ícones ou links podem ser adicionados aqui como no footer */}
                <span className={styles.socialPlaceholder}>github.com/italommf</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.supportOptions}>
          <div className={styles.option}>
            <h3>PIX</h3>
            <p>Sua contribuição direta ajuda nos custos de servidor.</p>
            <div className={styles.pixPlaceholder}>Chave PIX: contato@italommf.com.br</div>
          </div>
        </div>
      </div>
    </div>
  )
}
