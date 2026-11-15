'use client'

import { Mic, MicOff, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VoiceInterface.module.css'
import { askAtlas } from './atlasConversation'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type RecognitionErrorEvent = {
  error: string
}

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => Recognition

function getRecognitionConstructor() {
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function buildGreeting(name: string, exams: string[]) {
  const list =
    exams.length > 1
      ? `${exams.slice(0, -1).join(', ')} and ${exams[exams.length - 1]}`
      : (exams[0] ?? '')
  const examLine = exams.length
    ? `I've been looking at your routine exams for today. You have ${exams.length === 1 ? 'one' : exams.length} still waiting: ${list}. Want to walk through ${exams.length === 1 ? 'it' : 'them'} together, or would you rather start a little later?`
    : `Good news, you're all caught up on your routine exams for today. How are you feeling right now?`
  return `Welcome, ${name}. It's good to have you here. ${examLine}`
}

export default function VoiceInterface({
  userName,
  pendingExams,
}: {
  userName: string
  pendingExams: string[]
}) {
  const greetedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelRef = useRef<HTMLSpanElement>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const modeRef = useRef<HTMLElement>(null)
  const clockRef = useRef<HTMLTimeElement>(null)
  const barsRef = useRef<Array<HTMLElement | null>>([])
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const recognitionTimerRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const conversationRef = useRef<ChatTurn[]>([])
  const replyRequestRef = useRef(0)
  const waitingForReplyRef = useRef(false)
  const respondRef = useRef<(text: string) => void>(() => {})
  const speakingRef = useRef(false)
  const recognizingRef = useRef(false)
  const recognitionAllowedRef = useRef(true)
  const volumeRef = useRef(0)
  const wordPulseRef = useRef({ start: Number.NEGATIVE_INFINITY, duration: 180 })

  const [thinking, setThinking] = useState(false)
  const [typedMessage, setTypedMessage] = useState('')
  const [active, setActive] = useState(false)
  const [pending, setPending] = useState(false)
  const [coreStatus, setCoreStatus] = useState('STANDBY')
  const [transcript, setTranscript] = useState(
    "Talk to ATLAS or type a message.",
  )
  const [status, setStatus] = useState("Enable the microphone to connect your voice to the core.")

  const stopResources = useCallback((updateInterface = true) => {
    activeRef.current = false
    replyRequestRef.current++
    waitingForReplyRef.current = false
    speakingRef.current = false
    recognizingRef.current = false
    wordPulseRef.current.start = Number.NEGATIVE_INFINITY
    if (recognitionTimerRef.current) window.clearTimeout(recognitionTimerRef.current)
    recognitionTimerRef.current = null

    const recognition = recognitionRef.current
    if (recognition) {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.abort()
      } catch {
        // The browser may already have closed the recognition session.
      }
    }
    recognitionRef.current = null
    window.speechSynthesis?.cancel()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    sourceRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current = null
    samplesRef.current = null
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context && context.state !== 'closed') void context.close()
    volumeRef.current = 0

    if (updateInterface) {
      setActive(false)
      setThinking(false)
      if (modeRef.current) modeRef.current.textContent = "STANDBY"
      setCoreStatus('STANDBY')
    }
  }, [])

  const startListening = useCallback(() => {
    if (
      !activeRef.current ||
      speakingRef.current ||
      waitingForReplyRef.current ||
      recognizingRef.current ||
      !recognitionAllowedRef.current
    ) {
      return
    }

    const RecognitionApi = getRecognitionConstructor()
    if (!RecognitionApi) return

    if (!recognitionRef.current) {
      const recognition = new RecognitionApi()
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onstart = () => {
        recognizingRef.current = true
      }
      recognition.onresult = (event) => {
        if (!activeRef.current || speakingRef.current || waitingForReplyRef.current) return
        const text = event.results[0]?.[0]?.transcript
        if (!text) return
        respondRef.current(text)
      }
      recognition.onerror = (event) => {
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
          recognitionAllowedRef.current = false
          setStatus(
            "Speech recognition is unavailable. The microphone visualizer is still active.",
          )
        }
      }
      recognition.onend = () => {
        recognizingRef.current = false
        if (recognitionTimerRef.current) window.clearTimeout(recognitionTimerRef.current)
        if (activeRef.current && !speakingRef.current && !waitingForReplyRef.current && recognitionAllowedRef.current) {
          recognitionTimerRef.current = window.setTimeout(startListening, 700)
        }
      }
      recognitionRef.current = recognition
    }

    try {
      recognitionRef.current.start()
    } catch {
      recognizingRef.current = false
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) {
        setStatus('Atlas: ' + text)
        startListening()
        return
      }

      speakingRef.current = true
      wordPulseRef.current.start = Number.NEGATIVE_INFINITY
      if (recognitionTimerRef.current) window.clearTimeout(recognitionTimerRef.current)
      recognitionRef.current?.abort()
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const englishVoices = window.speechSynthesis
        .getVoices()
        .filter((item) => /^en(?:-|_|$)/i.test(item.lang))
      // The Web Speech API exposes voice names, but has no gender field.
      const maleVoiceName = /\b(?:male|aaron|alex|arthur|daniel|david|fred|george|guy|james|mark|ryan|richard|thomas)\b/i
      const maleVoices = englishVoices.filter((item) => maleVoiceName.test(item.name))
      const voice =
        maleVoices.find((item) => /^en[-_]us$/i.test(item.lang)) ??
        maleVoices[0] ??
        englishVoices.find((item) => /^en[-_]us$/i.test(item.lang) && item.localService) ??
        englishVoices[0]
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'en-US'
      utterance.rate = 0.94
      utterance.pitch = 0.94

      setStatus(`Atlas: ${text}`)
      setCoreStatus("SPEAKING")
      utterance.onboundary = (event) => {
        if (!speakingRef.current || event.name !== 'word') return
        const word = text.slice(event.charIndex).match(/^\S+/)?.[0] ?? ''
        wordPulseRef.current = {
          start: performance.now(),
          duration: Math.min(260, 100 + word.length * 15),
        }
      }
      const finish = () => {
        wordPulseRef.current.start = Number.NEGATIVE_INFINITY
        speakingRef.current = false
        setCoreStatus(activeRef.current ? "LISTENING" : 'STANDBY')
        if (activeRef.current) {
          recognitionTimerRef.current = window.setTimeout(startListening, 600)
        }
      }
      utterance.onend = finish
      utterance.onerror = () => {
        finish()
        setStatus('Atlas: ' + text + " · Audio could not be played.")
      }
      window.speechSynthesis.speak(utterance)
    },
    [startListening],
  )

  async function respondTo(text: string) {
    const message = text.trim().slice(0, 1600)
    if (!message || waitingForReplyRef.current || speakingRef.current) return
    const request = ++replyRequestRef.current
    waitingForReplyRef.current = true
    setThinking(true)
    if (recognitionTimerRef.current) window.clearTimeout(recognitionTimerRef.current)
    recognitionRef.current?.abort()
    setTranscript("You: " + message)
    setStatus("ATLAS is thinking…")
    setCoreStatus("PROCESSING")
    const history: ChatTurn[] = [...conversationRef.current.slice(-12), { role: 'user', content: message }]
    try {
      const result = await askAtlas(history, { name: userName, pendingExams })
      if (request !== replyRequestRef.current) return
      waitingForReplyRef.current = false
      if ('reply' in result) {
        conversationRef.current = [...history, { role: 'assistant' as const, content: result.reply }].slice(-12)
        speak(result.reply)
        return
      }
      setStatus(result.error)
    } catch {
      if (request !== replyRequestRef.current) return
      setStatus("The connection to ATLAS was lost. Try again.")
    } finally {
      if (request === replyRequestRef.current) {
        waitingForReplyRef.current = false
        setThinking(false)
        if (!speakingRef.current) {
          setCoreStatus(activeRef.current ? "LISTENING" : 'STANDBY')
          if (activeRef.current) recognitionTimerRef.current = window.setTimeout(startListening, 700)
        }
      }
    }
  }

  useEffect(() => {
    respondRef.current = (text) => void respondTo(text)
  })

  const greeting = buildGreeting(userName, pendingExams)
  const greetingRef = useRef(greeting)
  useEffect(() => {
    greetingRef.current = greeting
  })

  // Greet the signed-in crew member once when the voice interface opens.
  useEffect(() => {
    if (greetedRef.current || !('speechSynthesis' in window)) return
    greetedRef.current = true
    setTranscript('ATLAS: ' + greetingRef.current)
    const timer = window.setTimeout(() => speak(greetingRef.current), 400)
    return () => {
      window.clearTimeout(timer)
      greetedRef.current = false
    }
  }, [speak])

  const toggleMicrophone = async () => {
    if (pending) return
    if (activeRef.current) {
      stopResources()
      setStatus("Microphone off. Core in breathing mode.")
      return
    }

    setPending(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const context = new AudioContext()
      audioContextRef.current = context
      await context.resume()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      if (!audioContextRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      streamRef.current = stream
      sourceRef.current = source
      analyserRef.current = analyser
      samplesRef.current = new Float32Array(analyser.fftSize)
      activeRef.current = true
      recognitionAllowedRef.current = true
      setActive(true)
      if (modeRef.current) modeRef.current.textContent = "LISTENING"
      setCoreStatus('VOICE LINK')
      setStatus("I'm listening. Speak and watch the core respond.")

      stream.getAudioTracks()[0]?.addEventListener('ended', () => {
        if (!activeRef.current) return
        stopResources()
        setStatus("The microphone was interrupted. You can enable it again.")
      })

      const RecognitionApi = getRecognitionConstructor()
      speak(
        `Hello, I'm Atlas. Systems online. ${
          RecognitionApi
            ? "You can talk to me."
            : "This browser only supports microphone visualization."
        }`,
      )
    } catch (error) {
      stopResources()
      const name = error instanceof DOMException ? error.name : ''
      setStatus(
        name === 'NotAllowedError'
          ? "Permission denied. Enable the microphone in your browser and try again."
          : name === 'NotFoundError'
            ? "No microphone was found. Connect one and try again."
            : name === 'NotReadableError'
              ? "The microphone could not be accessed. Check whether another application is using it."
              : "The microphone requires a supported browser and a secure connection.",
      )
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const arc = (radius: number, start: number, end: number, width: number, alpha: number) => {
      context.beginPath()
      context.arc(0, 0, radius, start, end)
      context.lineWidth = width
      context.strokeStyle = `rgba(104,231,255,${alpha})`
      context.stroke()
    }

    const render = (milliseconds: number) => {
      const time = milliseconds * 0.001
      let target = 0
      if (speakingRef.current) {
        const pulse = wordPulseRef.current
        const progress = (milliseconds - pulse.start) / pulse.duration
        if (progress >= 0 && progress < 1) {
          target = 0.85 * Math.sin(Math.PI * Math.pow(progress, 0.6))
        }
      } else if (analyserRef.current && samplesRef.current) {
        analyserRef.current.getFloatTimeDomainData(samplesRef.current)
        let sum = 0
        for (const sample of samplesRef.current) sum += sample * sample
        target = Math.min(1, Math.max(0, Math.sqrt(sum / samplesRef.current.length) - 0.002) * 22)
      }
      const volume =
        volumeRef.current +
        (target - volumeRef.current) * (target > volumeRef.current ? 0.65 : 0.24)
      volumeRef.current = volume

      const size = canvas.clientWidth
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pixels = Math.round(size * dpr)
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels
        canvas.height = pixels
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, size, size)
      context.translate(size / 2, size / 2)
      const scale = size / 540
      context.scale(scale, scale)
      const breath = Math.sin(time * 1.5) * 0.012
      context.scale(1 + breath + volume * 0.1, 1 + breath + volume * 0.1)

      const glow = context.createRadialGradient(0, 0, 0, 0, 0, 230)
      glow.addColorStop(0, `rgba(22,172,218,${0.1 + volume * 0.18})`)
      glow.addColorStop(0.65, 'rgba(9,127,170,.04)')
      glow.addColorStop(1, 'transparent')
      context.fillStyle = glow
      context.fillRect(-250, -250, 500, 500)
      context.shadowColor = '#30d7ff'
      context.shadowBlur = 5 + volume * 20

      for (let ring = 0; ring < 5; ring += 1) {
        const radius = 166 + ring * 17
        context.save()
        context.rotate((reducedMotion ? 0 : time) * (ring % 2 ? -1 : 1) * (0.035 + ring * 0.018))
        arc(radius, 0, Math.PI * 2, 0.5, 0.12 + volume * 0.2)
        if (ring === 4) {
          for (let tick = 0; tick < 120; tick += 1) {
            const angle = (tick * Math.PI) / 60
            context.beginPath()
            context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
            context.lineTo(
              Math.cos(angle) * (radius + (tick % 5 === 0 ? 7 : 3)),
              Math.sin(angle) * (radius + (tick % 5 === 0 ? 7 : 3)),
            )
            context.strokeStyle = tick % 5 === 0 ? '#5ba9bd' : '#204753'
            context.stroke()
          }
        } else {
          for (let segment = 0; segment < 3; segment += 1) {
            const angle = (segment * Math.PI * 2) / 3 + ring * 0.5
            arc(
              radius,
              angle,
              angle + 0.55 + ring * 0.13,
              ring === 1 ? 4 : 1.5,
              0.5 + volume * 0.45,
            )
            arc(radius - 4, angle + 0.1, angle + 0.35, 1, 0.2 + volume * 0.4)
          }
        }
        context.restore()
      }

      context.shadowBlur = 4 + volume * 12
      const rotation = reducedMotion ? 0.35 : time * 0.16
      const radius = 116 * (1 + volume * 0.3)
      const project = (latitude: number, longitude: number) => {
        const x = Math.cos(latitude) * Math.cos(longitude)
        let z = Math.cos(latitude) * Math.sin(longitude)
        const y = Math.sin(latitude)
        const rotatedX = x * Math.cos(rotation) + z * Math.sin(rotation)
        z = -x * Math.sin(rotation) + z * Math.cos(rotation)
        const rotatedY = y * 0.94 - z * 0.34
        z = y * 0.34 + z * 0.94
        return [rotatedX * radius, rotatedY * radius, z] as const
      }
      const line = (points: ReadonlyArray<readonly [number, number, number]>) => {
        context.beginPath()
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(point[0], point[1])
          else context.lineTo(point[0], point[1])
        })
        const midpoint = points[Math.floor(points.length / 2)]
        context.strokeStyle = `rgba(101,228,255,${0.2 + Math.max(0, midpoint[2]) * 0.5 + volume * 0.15})`
        context.lineWidth = 0.65
        context.stroke()
      }
      for (let index = 1; index < 18; index += 1) {
        const latitude = -Math.PI / 2 + (index * Math.PI) / 18
        line(Array.from({ length: 81 }, (_, step) => project(latitude, (step * Math.PI) / 40)))
      }
      for (let index = 0; index < 28; index += 1) {
        line(
          Array.from({ length: 51 }, (_, step) =>
            project(-Math.PI / 2 + (step * Math.PI) / 50, (index * Math.PI) / 14),
          ),
        )
      }
      context.shadowBlur = 0
      context.fillStyle = '#d4fbff'
      for (let latitude = 2; latitude < 17; latitude += 3) {
        for (let longitude = 0; longitude < 28; longitude += 3) {
          const point = project(
            -Math.PI / 2 + (latitude * Math.PI) / 18,
            (longitude * Math.PI) / 14,
          )
          if (point[2] > 0.1) {
            context.globalAlpha = 0.35 + point[2] * 0.6
            context.fillRect(point[0] - 1, point[1] - 1, 2, 2)
          }
        }
      }
      context.globalAlpha = 1

      const level = Math.round(volume * 100)
      if (levelRef.current) levelRef.current.textContent = String(level).padStart(2, '0')
      if (meterRef.current) meterRef.current.style.width = `${level}%`
      barsRef.current.forEach((bar, index) => {
        if (bar)
          bar.style.height = `${3 + volume * 24 * (0.35 + 0.65 * Math.sin(index * 1.8 + time * 7) ** 2)}px`
      })
      if (activeRef.current || speakingRef.current) {
        if (modeRef.current) {
          modeRef.current.textContent = speakingRef.current
            ? "ATLAS SPEAKING"
            : volume > 0.07
              ? "VOICE DETECTED"
              : "LISTENING"
        }
      }
      if (clockRef.current) {
        clockRef.current.textContent = new Date().toLocaleTimeString('en-US', {
          hour12: false,
        })
      }
      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    const stopOnPageHide = () => stopResources()
    window.addEventListener('pagehide', stopOnPageHide)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      window.removeEventListener('pagehide', stopOnPageHide)
      stopResources(false)
    }
  }, [stopResources])

  return (
    <div className={styles.interface}>
      <header className={styles.systemHeader}>
        <span className={styles.brand}>ATLAS / SYSTEMS</span>
        <span className={styles.systemEdition}>NEURAL INTERFACE / MARK VII</span>
        <span className={styles.online}>
          <i /> SYSTEM ONLINE
        </span>
      </header>

      <section className={styles.hero}>
        <span>VOICE INTERFACE</span>
        <h1>ATLAS</h1>
        <p>VOICE ASSISTANT · REACTIVE INTERFACE</p>
      </section>

      <section className={styles.workspace} aria-label="Audio visualizer">
        <aside className={styles.panel}>
          <div className={styles.label}>01 / AUDIO INPUT</div>
          <div className={styles.value}>
            <span ref={levelRef}>00</span> <small>% RMS</small>
          </div>
          <div className={styles.meter}>
            <span ref={meterRef} />
          </div>
          <dl>
            <div>
              <dt>CHANNEL</dt>
              <dd>MICROPHONE</dd>
            </div>
            <div>
              <dt>STATUS</dt>
              <dd ref={modeRef}>STANDBY</dd>
            </div>
          </dl>
          <div className={styles.label}>SIGNAL ANALYSIS</div>
          <div className={styles.signal} aria-hidden="true">
            {Array.from({ length: 32 }, (_, index) => (
              <i
                key={index}
                ref={(node) => {
                  barsRef.current[index] = node
                }}
              />
            ))}
          </div>
          <p className={styles.small}>
            AMPLITUDE MONITORING
            <br />
            LOCAL PROCESSING
          </p>
        </aside>

        <div className={styles.stage}>
          <canvas
            ref={canvasRef}
            aria-label="Animated mesh sphere and cyan rings that respond to volume"
          />
          <i className={`${styles.corner} ${styles.topLeft}`} />
          <i className={`${styles.corner} ${styles.bottomRight}`} />
          <div className={styles.coreLabel}>
            ARC CORE / <span>{coreStatus}</span>
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.label}>02 / CORE STATUS</div>
          <div className={styles.tag}>
            <i /> STABLE
          </div>
          <dl>
            <div>
              <dt>PROTOCOL</dt>
              <dd>REACTIVE</dd>
            </div>
            <div>
              <dt>VISUALIZATION</dt>
              <dd>3D MESH</dd>
            </div>
          </dl>
          <div className={styles.label}>DIAGNOSTICS</div>
          <p className={styles.small}>
            VISUAL ENGINE INITIALIZED
            <br />
            VOICE LINK AVAILABLE
            <br />
            {active ? "CHANNEL AUTHORIZED" : "AWAITING AUTHORIZATION"}
          </p>
          <div className={`${styles.tag} ${styles.ready}`}>READY TO LISTEN.</div>
        </aside>
      </section>

      <section className={styles.controls}>
        <div className={styles.buttonRow}>
          <button
            className={active ? styles.activeButton : styles.micButton}
            type="button"
            onClick={() => void toggleMicrophone()}
            disabled={pending}
          >
            {active ? <MicOff /> : <Mic />}
            {pending
              ? "REQUESTING ACCESS…"
              : active
                ? "DISABLE MICROPHONE"
                : "ENABLE MICROPHONE"}
          </button>
          <button
            className={styles.testButton}
            type="button"
            onClick={() =>
              speak("Hello, I'm Atlas. Systems online. My interface responds while I speak.")
            }
            disabled={thinking}
          >
            <Volume2 /> TEST ATLAS VOICE
          </button>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault()
          if (!typedMessage.trim() || waitingForReplyRef.current || speakingRef.current) return
          void respondTo(typedMessage)
          setTypedMessage('')
        }} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, margin: '14px auto', maxWidth: 590 }}>
          <input
            aria-label="Message for ATLAS"
            placeholder="Type to ATLAS"
            maxLength={1600}
            value={typedMessage}
            onChange={(event) => setTypedMessage(event.target.value)}
            style={{ minWidth: 180, flex: '1 1 220px', padding: '10px 12px', color: '#deedf9', background: '#0a1923', border: '1px solid #2b6578', borderRadius: 6 }}
          />
          <button className={styles.testButton} type="submit" disabled={thinking || coreStatus === "SPEAKING" || !typedMessage.trim()}>
            Send
          </button>
        </form>
        <p className={styles.transcript} aria-live="polite">
          {transcript}
        </p>
        <p className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
        <p className={styles.privacy}>
          When you speak or send a message, the text and recent turns are sent to Google Gemini to generate a response. The browser processes speech recognition and may use its own audio service.
        </p>
      </section>

      <footer className={styles.footer}>
        <span>ATLAS OS / AUDIO REACTIVE INTERFACE</span>
        <time ref={clockRef}>00:00:00</time>
        <span>V. 07.01</span>
      </footer>
    </div>
  )
}
