import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './FAQPage.module.css'

const faqs = [
  {
    question: "O que é o Warbanner?",
    answer: "O Warbanner é uma plataforma criada para os jogadores de Warface gerarem banners personalizados com suas patentes, clã, nick e estatísticas principais. Além de organizar seus perfis, a plataforma permite salvar e acompanhar todos os seus desafios (marcas, insígnias e fitas) através do envio de imagens do jogo.",
    type: "normal"
  },
  {
    question: "Até quando poderei fazer upload das minhas imagens do perfil?",
    answer: "O upload poderá ser feito por um tempo indeterminado, desde que o usuário tire as screenshots antes do Warface Clutch se encerrar.",
    type: "normal"
  },
  {
    question: "Subi as imagens mas não apareceu nenhum desafio, qual o problema?",
    answer: "As imagens precisam seguir os seguintes padrões para que o processamento siga sem problemas: Imagem no formato 16x9 (formatos 4x3 não são aceitos), e resoluções aceitas explicitamente: 1280x720 (720p), 1920x1080 (1080p), 2560x1440 (1440p) e 3840x2160 (4K). A screenshot precisa ser legível e os desafios precisam estar estáticos no lugar. Ao tirar a screenshot, certifique-se de que as linhas das duas colunas de desafios pararam de se mover e estão estáticas.",
    type: "error"
  },
  {
    question: "O Warbanner suporta quais versões do warface?",
    answer: "Suportamos a versão atual do Warface Clutch de PC na versão BR.",
    type: "normal"
  },
  {
    question: "O Warbanner suporta as imagens do console?",
    answer: "Não, devido a diferença de layout das imagens, atualmente suportamos apenas as imagens do Warface Clutch de PC.",
    type: "normal"
  },
  {
    question: "Há suporte para outros idiomas?",
    answer: "Atualmente o suporte é apenas para o português na transcrição dos desafios. O inglês está em fase de implementação, porém sem data para chegar ao site. De qualquer forma, deixe salvo suas imagens em inglês para que, quando chegar o suporte ao site, você possa processar seus desafios.",
    type: "normal"
  },
  {
    question: "Está faltando desafios ou algum dado meu está errado, o que faço?",
    answer: "Abra um ticket de suporte para que um ADM / Moderador possa avaliar seu caso pessoalmente e tentar resolver da melhor forma possível. Guarde as imagens originais dos desafios para poder provar a legitimidade da sua solicitação.",
    type: "error"
  },
  {
    question: "Tenho menos ou mais desafios do que foi enviado nas imagens",
    answer: "O sistema não tem 100% de precisão na leitura mas se aproxima muito disso. Caso algum desafio que você não tenha apareça ou falte algum que você tem, entre em contato com o suporte através da abertura de um ticket. O suporte fará o melhor possível para atender sua solicitação.",
    type: "error"
  }
]

export function FAQPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>F.A.<span>Q</span></h1>
          <p className={styles.subtitle}>Dúvidas frequentes e soluções de erros comuns</p>
        </div>

        <div className={styles.faqList}>
        {faqs.map((faq, index) => {
          const isActive = activeIndex === index
          const isError = faq.type === "error"
          
          return (
            <div 
              key={index} 
              className={`${styles.faqItem} ${isActive ? styles.faqItemActive : ''} ${isError ? styles.faqItemError : ''}`}
            >
              <button 
                className={styles.faqQuestion} 
                onClick={() => toggleAccordion(index)}
              >
                <span>{faq.question}</span>
                <span className={styles.icon}>▼</span>
              </button>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        </div>
      </motion.div>
    </div>
  )
}
