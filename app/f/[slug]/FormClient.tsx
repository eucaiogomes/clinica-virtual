'use client'

import { useState } from 'react'
import styles from './quiz.module.css'
import type { Template, TemplateQuestion, ResultTier } from '@/types'

interface Props {
  slug: string
  template: Template
  questions: TemplateQuestion[]
  ctaUrl: string
  ctaLabel: string
  professionalName: string
}

type Stage = 'quiz' | 'lead' | 'result' | 'submitted'

export default function FormClient({ slug, template, questions, ctaUrl, ctaLabel, professionalName }: Props) {
  const total = questions.length
  const maxScore = total * 4

  const [stage, setStage] = useState<Stage>('quiz')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})   // questionIndex → optionIndex
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ pct: number; tier: ResultTier } | null>(null)

  const question = questions[currentQ]
  const selectedIndex = answers[currentQ]
  const hasAnswer = selectedIndex !== undefined

  const progress = stage === 'quiz'
    ? Math.round((currentQ / total) * 100)
    : stage === 'lead' ? 100
    : 100

  const progressLabel = stage === 'quiz'
    ? `Pergunta ${currentQ + 1} de ${total}`
    : stage === 'lead' ? 'Quase lá!'
    : 'Resultado 🌿'

  function selectOption(optIndex: number) {
    setAnswers({ ...answers, [currentQ]: optIndex })
  }

  function goNext() {
    if (currentQ < total - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setStage('lead')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function calcResult() {
    const rawScore = Object.values(answers).reduce((sum, idx) => sum + (idx + 1), 0)
    const pct = Math.round((rawScore / maxScore) * 100)
    const cfg = template.result_config
    let tier: ResultTier

    if (!cfg) {
      tier = {
        title: pct <= 45 ? 'Você carrega ciclos que pedem <em>atenção.</em>' : pct <= 70 ? 'Você está <em>no limiar da mudança.</em>' : 'Você está <em>mais próxima do que imagina.</em>',
        text: 'Suas respostas revelam um momento importante da sua vida. Com o apoio certo, você pode avançar de forma profunda e duradoura.',
        items: [
          { icon: '🌿', title: 'Autoconhecimento', desc: 'Responder esse teste já é um primeiro passo de coragem.' },
          { icon: '✨', title: 'Transformação possível', desc: 'Com suporte profissional, os processos acontecem de forma mais segura.' },
        ],
      }
    } else if (pct <= 45) {
      tier = cfg.low
    } else if (pct <= 70) {
      tier = cfg.mid
    } else {
      tier = cfg.high
    }

    return { pct, tier }
  }

  async function handleShowResult() {
    if (!name.trim()) { alert('Por favor, diga seu nome 🌿'); return }
    if (!email.trim() || !email.includes('@')) { alert('Por favor, insira um e-mail válido 🌿'); return }

    setSubmitting(true)
    const computed = calcResult()
    setResult(computed)

    try {
      await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          patientName: name,
          patientEmail: email,
          scorePct: computed.pct,
          answers: questions.map((q, i) => ({
            questionId: q.id,
            answerIndex: answers[i] ?? 0,
            answer: q.options?.[answers[i] ?? 0] ?? '',
          })),
        }),
      })
    } catch {
      // submission failure is silent — result still shown
    }

    setSubmitting(false)
    setStage('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function restart() {
    setStage('quiz')
    setCurrentQ(0)
    setAnswers({})
    setName('')
    setEmail('')
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
      />

      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{template.category ?? 'Exercício Terapêutico'} · Gratuito</p>
          <h1
            className={styles.heroTitle}
            dangerouslySetInnerHTML={{ __html: template.title }}
          />
          <div className={styles.heroMeta}>
            <span>{total} {total === 1 ? 'pergunta' : 'perguntas'}</span>
            <span>Menos de {template.duration_minutes} minutos</span>
            <span>Resultado imediato</span>
          </div>
        </section>

        {/* Progress bar */}
        <div className={styles.progWrap}>
          <span className={styles.progLabel}>{progressLabel}</span>
          <div className={styles.progBar}>
            <div className={styles.progFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progPct}>{progress}%</span>
        </div>

        <div className={styles.main}>
          {/* Quiz */}
          {stage === 'quiz' && question && (
            <div className={styles.qcard} key={currentQ}>
              <p className={styles.qNum}>
                Pergunta {String(currentQ + 1).padStart(2, '0')} · {String(total).padStart(2, '0')}
              </p>
              <p className={styles.qText}>{question.question}</p>
              <div className={styles.opts}>
                {(question.options ?? []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selectOption(i)}
                    className={`${styles.opt} ${selectedIndex === i ? styles.optSelected : ''}`}
                  >
                    <span className={`${styles.optCircle} ${selectedIndex === i ? styles.checkMark : ''}`} />
                    {opt}
                  </button>
                ))}
              </div>
              <div className={styles.qNav}>
                {currentQ > 0 ? (
                  <button className={styles.btnBack} onClick={goBack}>← Voltar</button>
                ) : <span />}
                <button
                  className={styles.btnNext}
                  disabled={!hasAnswer}
                  onClick={goNext}
                >
                  {currentQ < total - 1 ? 'Próxima →' : 'Ver meu resultado →'}
                </button>
              </div>
            </div>
          )}

          {/* Lead capture */}
          {stage === 'lead' && (
            <div className={styles.leadCard}>
              <div className={styles.leadIcon}>🌿</div>
              <h2 className={styles.leadTitle}>
                Seu resultado está <em>pronto!</em>
              </h2>
              <p className={styles.leadSub}>
                Preencha abaixo para receber sua análise completa e descobrir o que ela revela sobre o seu momento de vida.
              </p>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Seu nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Como posso te chamar?"
                  className={styles.fieldInput}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Seu melhor e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className={styles.fieldInput}
                />
              </div>
              <button
                className={styles.btnSubmit}
                onClick={handleShowResult}
                disabled={submitting}
              >
                {submitting ? 'Calculando...' : 'Quero ver meu resultado →'}
              </button>
              <p className={styles.privacy}>🔒 Seus dados estão seguros. Sem spam, nunca.</p>
            </div>
          )}

          {/* Result */}
          {stage === 'result' && result && (
            <div className={styles.resultCard}>
              <div className={styles.resultTop}>
                <div className={styles.resultPct}>{result.pct}%</div>
                <p className={styles.resultPctSub}>de prontidão para a mudança</p>
                <h2
                  className={styles.resultTitle}
                  dangerouslySetInnerHTML={{ __html: result.tier.title }}
                />
                <p className={styles.resultText}>{result.tier.text}</p>
              </div>
              <div className={styles.resultBody}>
                <div className={styles.resultItems}>
                  {result.tier.items.map((item, i) => (
                    <div key={i} className={styles.rItem}>
                      <span className={styles.rItemIcon}>{item.icon}</span>
                      <div>
                        <strong className={styles.rItemStrong}>{item.title}</strong>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.ctaBox}>
                  <strong className={styles.ctaStrong}>O próximo passo é seu.</strong>
                  <p className={styles.ctaSub}>
                    {professionalName
                      ? `Entre em contato com ${professionalName} e dê esse passo.`
                      : 'Com o apoio certo, sua transformação acontece de forma mais profunda e duradoura.'}
                  </p>
                  {ctaUrl ? (
                    <a href={ctaUrl} className={styles.btnCta} target="_blank" rel="noopener noreferrer">
                      {ctaLabel} →
                    </a>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
                      Fale com seu profissional de saúde.
                    </div>
                  )}
                </div>

                <button className={styles.reiniciar} onClick={restart}>
                  ↩ Refazer o teste
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          Criado com cuidado · Exercício Terapêutico 🌿
        </footer>
      </div>
    </>
  )
}
