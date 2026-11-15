'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bone,
  Brain,
  Camera,
  Check,
  ChevronDown,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Dna,
  Droplets,
  Dumbbell,
  Eye,
  FileJson,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  LogIn,
  Lock,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  Microscope,
  Moon,
  Orbit,
  Play,
  Radio,
  Radiation,
  RefreshCcw,
  ScanFace,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Signature,
  Sparkles,
  Stethoscope,
  Thermometer,
  Upload,
  UploadCloud,
  UserRound,
  Users,
  Volume2,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CrewMember, environments, initialCrew, Status, systems } from './data'
import VoiceInterface from './VoiceInterface'
import { localizeSavedDemo } from './demoLanguage'

type View = 'voice' | 'dashboard' | 'body' | 'manual' | 'alerts' | 'emotional' | 'report'
type Role = 'astronaut' | 'cmo' | 'commander'
type Scenario = 'nominal' | 'gradual' | 'emergency'
type ExamTransmission = 'pending' | 'sending' | 'sent'
type SensorConnection = 'connected' | 'disconnected' | 'unconfigured'
type TaskStatus = 'pending' | 'in-progress' | 'processing' | 'completed'
type TransmissionStage = 'saved' | 'pending' | 'sending' | 'received' | 'review'
type ClinicalMeasurements = {
  hr: number
  systolic: number
  diastolic: number
  spo2: number
  respiratoryRate: number
  glucose: number
  temp: number
  sleep: number
  reaction: number
  exercise: number
  exerciseGoal: number
  dailyDose: number
  radiation: number
}
type ChartPoint = {
  label: string
  hr: number
  systolic: number
  diastolic: number
  spo2: number
  respiratoryRate: number
  sleep: number
  reaction: number
  exercise: number
  exerciseGoal: number
  glucose: number
  temp: number
  dailyDose: number
  radiation: number
}
type MeasurementSnapshot = {
  receivedAt: string
  measurements: Partial<ClinicalMeasurements>
  history?: ChartPoint[]
  demo?: boolean
}
type CareTask = {
  id: string
  title: string
  instruction: string
  status: TaskStatus
  priority: number
  type: 'evaluation' | 'care'
  systemId: string
  procedure: string[]
  result: string
  measurements?: Partial<ClinicalMeasurements>
}
type DemoAlert = {
  id: string
  systemId: string
  title: string
  detail: string
  status: 'attention' | 'urgent'
}
type DemoTransmission = {
  id: string
  taskId: string
  title: string
  result: string
  createdAt: string
  stage: TransmissionStage
}
type DemoState = {
  tasks: CareTask[]
  snapshot: MeasurementSnapshot
  alerts: DemoAlert[]
  transmissions: DemoTransmission[]
}
type ExamReport = {
  id: string
  crewId: string
  crewName: string
  systemId: string
  exam: string
  result: string
  completedAt: string
  transmission: ExamTransmission
  demo?: boolean
  measurements?: Partial<ClinicalMeasurements>
}
type AlertData = { crew: CrewMember; title: string; detail: string; steps: string[] }

const roleMeta: Record<Role, { label: string; name: string; crewId: string; initials: string }> = {
  astronaut: { label: "Astronaut", name: 'Emma Jones', crewId: 'mateo', initials: 'EJ' },
  cmo: {
    label: "Chief Medical Officer · CMO",
    name: 'Dr. Marcus Vance',
    crewId: 'marcus',
    initials: 'MV',
  },
  commander: {
    label: "Mission Commander",
    name: 'Elena Rostova',
    crewId: 'elena',
    initials: 'ER',
  },
}

const permissions = {
  astronaut: { allVitals: false, reports: false, protocols: false },
  cmo: { allVitals: true, reports: true, protocols: true },
  commander: { allVitals: true, reports: false, protocols: true },
} satisfies Record<Role, Record<string, boolean>>

const statusMeta: Record<Status, { label: string; className: string; dot: string }> = {
  optimal: { label: "OPTIMAL", className: 'status-optimal', dot: 'bg-emerald-400' },
  warning: { label: "PREVENTIVE", className: 'status-warning', dot: 'bg-amber-400' },
  critical: { label: "CRITICAL", className: 'status-critical', dot: 'bg-red-400' },
}

const navItems = [
  { id: 'voice' as View, label: "Voice interface", icon: Mic },
  { id: 'body' as View, label: 'Body Twin', icon: Activity },
  { id: 'emotional' as View, label: "Emotional health", icon: MessageCircle },
  { id: 'alerts' as View, label: "Alert center", icon: ShieldAlert },
  { id: 'dashboard' as View, label: "Crew member", icon: UserRound },
]

const initialCareTasks: CareTask[] = [
  {
    id: 'blood-pressure',
    title: "Repeat blood pressure measurement",
    instruction: "Repeat the reading following the blood pressure monitor protocol.",
    status: 'pending',
    priority: 1,
    type: 'evaluation',
    systemId: 'cardio',
    procedure: [
      "Check that the Emma Jones profile is selected on the device screen.",
      "Follow the approved blood pressure monitor instructions until it confirms a valid reading.",
    ],
    result: '142/90 mmHg',
    measurements: { systolic: 142, diastolic: 90 },
  },
  {
    id: 'medical-exercise',
    title: "Complete scheduled exercise",
    instruction: "Complete the remaining 10 minutes of your resistance exercise goal.",
    status: 'pending',
    priority: 2,
    type: 'care',
    systemId: 'muscular',
    procedure: [
      "Review the exercise block assigned by the medical plan on the resistance device.",
      "Follow the device instructions until you complete today's goal.",
    ],
    result: "Exercise 30/30 min",
    measurements: { exercise: 30 },
  },
  {
    id: 'rest-reaction-followup',
    title: "Rest and reaction follow-up",
    instruction: "Review today's scheduled follow-up activity.",
    status: 'pending',
    priority: 3,
    type: 'evaluation',
    systemId: 'neuro',
    procedure: [
      "Confirm that the demo cognitive test is linked to the Emma Jones profile.",
      "Follow the device's visual instructions until it confirms a valid result.",
    ],
    result: "Median reaction time 310 ms · Sleep 6 h",
    measurements: { reaction: 310, sleep: 6 },
  },
  {
    id: 'glucose-analysis',
    title: "Glucose analysis",
    instruction: "Result received from the analyzer.",
    status: 'completed',
    priority: 4,
    type: 'evaluation',
    systemId: 'digestive',
    procedure: ["View the result validated by the analyzer."],
    result: "Fasting glucose 92 mg/dL",
    measurements: { glucose: 92 },
  },
]

const demoHistory: ChartPoint[] = [
  [72, 136, 86, 98, 15, 6.8, 285, 30, 95, 36.5, 0.12, 17.53],
  [74, 138, 87, 98, 16, 6.6, 289, 30, 94, 36.6, 0.14, 17.67],
  [73, 140, 88, 99, 15, 6.5, 292, 25, 93, 36.6, 0.13, 17.8],
  [75, 139, 87, 98, 16, 6.4, 297, 30, 96, 36.7, 0.16, 17.96],
  [74, 141, 89, 98, 16, 6.3, 301, 22, 94, 36.6, 0.15, 18.11],
  [77, 143, 91, 98, 17, 6.1, 306, 24, 93, 36.7, 0.14, 18.25],
  [76, 145, 92, 98, 16, 6, 310, 20, 92, 36.7, 0.15, 18.4],
].map(
  (
    [
      hr,
      systolic,
      diastolic,
      spo2,
      respiratoryRate,
      sleep,
      reaction,
      exercise,
      glucose,
      temp,
      dailyDose,
      radiation,
    ],
    index,
  ) => ({
    label: ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', "Yesterday", "Today"][index],
    hr,
    systolic,
    diastolic,
    spo2,
    respiratoryRate,
    sleep,
    reaction,
    exercise,
    exerciseGoal: 30,
    glucose,
    temp,
    dailyDose,
    radiation,
  }),
)

const initialDemoState: DemoState = {
  tasks: initialCareTasks,
  snapshot: {
    receivedAt: '2026-10-05T08:30:00.000Z',
    demo: true,
    measurements: {
      hr: 76,
      systolic: 145,
      diastolic: 92,
      spo2: 98,
      respiratoryRate: 16,
      temp: 36.7,
      glucose: 92,
      sleep: 6,
      reaction: 310,
      exercise: 20,
      exerciseGoal: 30,
      dailyDose: 0.15,
      radiation: 18.4,
    },
    history: demoHistory,
  },
  alerts: [
    {
      id: 'pressure-review',
      systemId: 'cardio',
      title: "Blood pressure awaiting review",
      detail: "145/92 mmHg · Repeat reading scheduled",
      status: 'attention',
    },
    {
      id: 'rest-reaction-review',
      systemId: 'neuro',
      title: "Rest and reaction follow-up",
      detail: "Sleep 6 h · Median reaction time 310 ms",
      status: 'attention',
    },
  ],
  transmissions: [],
}

function StatusPill({ status }: { status: Status }) {
  const s = statusMeta[status]
  return (
    <span className={`status-pill ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function Avatar({
  member,
  large = false,
  photo = false,
}: {
  member: CrewMember
  large?: boolean
  photo?: boolean
}) {
  return (
    <div
      className={`avatar ${large ? 'h-20 w-20 text-xl' : 'h-11 w-11 text-sm'}`}
      style={{ '--avatar': member.color } as React.CSSProperties}
    >
      {photo ? (
        <Image
          className="avatar-photo"
          src="/atlas-astronaut.jpg"
          alt={`Portrait of ${member.name}`}
          width={160}
          height={160}
          priority
        />
      ) : member.id === 'mateo' ? (
        <Image
          className="avatar-photo"
          src="/atlas-astronaut.jpg"
          alt={`Portrait of ${member.name}`}
          width={160}
          height={160}
        />
      ) : (
        <span>{member.initials}</span>
      )}
      <div className="avatar-ring" />
    </div>
  )
}

const greetingCrew = {
  diego: { name: 'Diego Alvarado', assignment: "Lead crew member" },
  ariel: { name: 'Ariel Sion', assignment: "Registered crew member" },
} as const
type GreetingCrewId = keyof typeof greetingCrew
const greetingRole: Record<GreetingCrewId, Role> = { diego: 'commander', ariel: 'astronaut' }
const greetingKey = (id: GreetingCrewId) => 'atlas.greeting.' + id + '.v1'

type GreetingFace = { detection: { box: { width: number; height: number } }; descriptor: Float32Array }
type GreetingFaceApi = {
  nets: Record<'tinyFaceDetector' | 'ssdMobilenetv1' | 'faceLandmark68TinyNet' | 'faceRecognitionNet', { loadFromUri: (url: string) => Promise<void> }>
  TinyFaceDetectorOptions: new (options: { inputSize: number; scoreThreshold: number }) => object
  SsdMobilenetv1Options: new (options: { minConfidence: number; maxResults: number }) => object
  detectAllFaces: (input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, options: object) => {
    withFaceLandmarks: (tiny: boolean) => { withFaceDescriptors: () => Promise<GreetingFace[]> }
  }
}
let greetingModels: Promise<GreetingFaceApi> | undefined
function loadGreetingModels() {
  greetingModels ??= (async () => {
    const browser = window as Window & { faceapi?: GreetingFaceApi }
    if (!browser.faceapi) await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
      script.onload = () => resolve()
      script.onerror = () => { script.remove(); reject(new Error('model-load')) }
      document.head.append(script)
    })
    const api = browser.faceapi
    if (!api) throw new Error('model-load')
    const weights = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'
    await Promise.all([api.nets.tinyFaceDetector, api.nets.faceLandmark68TinyNet, api.nets.faceRecognitionNet].map((net) => net.loadFromUri(weights)))
    return api
  })().catch((error: unknown) => { greetingModels = undefined; throw error })
  return greetingModels
}

function readGreetingFace(id: GreetingCrewId): number[] | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(greetingKey(id)) ?? 'null')
    return Array.isArray(value) && value.length === 128 && value.every((x) => typeof x === 'number' && Number.isFinite(x)) ? value : null
  } catch { return null }
}

function sayCrewGreeting(id: GreetingCrewId) {
  if (!('speechSynthesis' in window)) return
  const welcome = new SpeechSynthesisUtterance("Welcome, " + greetingCrew[id].name + '.')
  const voices = speechSynthesis.getVoices().filter((voice) => /^en(?:-|_|$)/i.test(voice.lang))
  const voice = voices.find((item) => /^en[-_]US$/i.test(item.lang) && item.localService) ?? voices.find((item) => /^en[-_]US$/i.test(item.lang)) ?? voices[0]
  if (voice) welcome.voice = voice
  welcome.lang = voice?.lang ?? 'en-US'
  welcome.rate = 0.94
  welcome.pitch = 0.94
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(welcome)
}

function CrewGreetingSetup({ id }: { id: GreetingCrewId }) {
  const member = greetingCrew[id]
  const [ready, setReady] = useState(false)
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState("Select the reference photo for " + member.name + '.')
  useEffect(() => { if (readGreetingFace(id)) { setReady(true); setStatus("Facial reference registered in this browser.") } }, [id])
  async function addReference(file: File) {
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
      setStatus("Choose an image up to 12 MB.")
      return
    }
    setWorking(true)
    setStatus("Preparing facial reference…")
    const url = URL.createObjectURL(file)
    try {
      const api = await loadGreetingModels()
      const image = new window.Image()
      image.src = url
      await image.decode()
      await api.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights')
      const crop = document.createElement('canvas')
      crop.width = 640
      crop.height = Math.round(640 * image.naturalHeight * 0.65 / (image.naturalWidth * 0.82))
      const ctx = crop.getContext('2d')
      if (!ctx) throw new Error('image-decode')
      ctx.drawImage(image, image.naturalWidth * 0.05, image.naturalHeight * 0.07, image.naturalWidth * 0.82, image.naturalHeight * 0.65, 0, 0, crop.width, crop.height)
      const options = new api.SsdMobilenetv1Options({ minConfidence: 0.5, maxResults: 3 })
      let faces = await api.detectAllFaces(image, options).withFaceLandmarks(true).withFaceDescriptors()
      if (!faces.length) faces = await api.detectAllFaces(crop, options).withFaceLandmarks(true).withFaceDescriptors()
      const area = (face: GreetingFace) => face.detection.box.width * face.detection.box.height
      faces.sort((a, b) => area(b) - area(a))
      if (!faces[0] || (faces[1] && area(faces[0]) < area(faces[1]) * 2)) {
        setStatus("No clear primary face was found. Choose a front-facing photo with only one face.")
        return
      }
      localStorage.setItem(greetingKey(id), JSON.stringify(Array.from(faces[0].descriptor)))
      setReady(true)
      setStatus("Facial reference registered in this browser. You can test the greeting.")
    } catch { setStatus("The reference could not be registered. Check your connection and browser storage.") }
    finally { URL.revokeObjectURL(url); setWorking(false) }
  }
  return (
    <main className="login-shell">
      <section className="login-grid"><div className="login-panel credential-form">
        <h1>{member.name}</h1><p>{member.assignment}</p>
        <label htmlFor="ariel-reference">Reference photo</label>
        <input id="ariel-reference" type="file" accept="image/*" disabled={working} onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void addReference(file)
        }} />
        <p role="status">{status}</p>
        <p>ATLAS processes the photo in your browser and stores only the facial template on this device.</p>
        {ready && <a className="primary-btn" href="/?saludo=1">Go to sign-in and test the greeting</a>}
      </div></section>
    </main>
  )
}

function CrewGreeting({ onRecognized }: { onRecognized: (role: Role, crewId?: GreetingCrewId) => void }) {
  const onRecognizedRef = useRef(onRecognized)
  onRecognizedRef.current = onRecognized
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState("Preparing the crew greeting…")
  const [blocked, setBlocked] = useState(false)
  const [recognized, setRecognized] = useState<GreetingCrewId | null>(null)
  useEffect(() => {
    let current = true
    let stream: MediaStream | undefined
    let timer: number | undefined
    let loginTimer: number | undefined
    let confirmations = 0
    let candidate: GreetingCrewId | null = null
    const stop = () => {
      current = false
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (video.current) video.current.srcObject = null
    }
    const start = async () => {
      const policy = (document as Document & { featurePolicy?: { allowsFeature(name: string): boolean } }).featurePolicy
      if (policy?.allowsFeature('camera') === false) {
        setBlocked(true)
        setStatus("This embedded view blocks the camera. Open sign-in in its own tab.")
        return
      }
      const references = (Object.keys(greetingCrew) as GreetingCrewId[]).flatMap((id) => {
        const template = readGreetingFace(id)
        return template ? [{ id, template }] : []
      })
      if (!references.length) { setStatus("No facial references are configured in this browser."); return }
      try {
        const api = await loadGreetingModels()
        if (!current) return
        setStatus("Waiting for camera permission…")
        const capture = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false })
        if (!current) { capture.getTracks().forEach((track) => track.stop()); return }
        stream = capture
        const element = video.current
        if (!element) { stop(); return }
        element.srcObject = capture
        await element.play()
        if (!current) return
        const options = new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.65 })
        const until = performance.now() + 120_000
        setStatus("Looking for a match. Look straight at the camera.")
        const sample = async () => {
          try {
            const faces = await api.detectAllFaces(element, options).withFaceLandmarks(true).withFaceDescriptors()
            if (!current) return
            const face = faces.length === 1 ? faces[0] : undefined
            const matches = face ? references.map(({ id, template }) => ({
              id, distance: Math.sqrt(template.reduce((sum, value, i) => sum + (value - face.descriptor[i]) ** 2, 0)),
            })).sort((a, b) => a.distance - b.distance) : []
            const best = matches[0]
            const nextCandidate = best && best.distance <= 0.48 && (!matches[1] || matches[1].distance - best.distance >= 0.07) ? best.id : null
            confirmations = nextCandidate ? nextCandidate === candidate ? confirmations + 1 : 1 : 0
            candidate = nextCandidate
            if (candidate && confirmations >= 3) {
              setRecognized(candidate)
              setStatus("Welcome, " + greetingCrew[candidate].name + '.')
              stop()
              sayCrewGreeting(candidate)
              const matched = candidate
              loginTimer = window.setTimeout(() => onRecognizedRef.current(greetingRole[matched], matched), 2500)
              return
            }
            if (performance.now() < until) timer = window.setTimeout(() => void sample(), 400)
            else { stop(); setStatus("No match was confirmed. Use Credentials or return to Biometrics to try again."); }
          } catch { if (current) { stop(); setStatus("Facial recognition was interrupted."); } }
        }
        void sample()
      } catch (error) {
        if (!current) return
        stop()
        setStatus(error instanceof DOMException && error.name === 'NotAllowedError'
          ? "Allow camera access for this site and reload sign-in." : "Facial recognition could not start.")
      }
    }
    void start()
    window.addEventListener('pagehide', stop)
    return () => { window.removeEventListener('pagehide', stop); window.clearTimeout(loginTimer); stop() }
  }, [])
  return (
    <div>
      <div className="scanner">
        <video ref={video} autoPlay muted playsInline />
        <div className="scan-placeholder" aria-live="polite"><span>{status}</span>{recognized && <small>{greetingCrew[recognized].assignment}</small>}</div>
        <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
      </div>
      {blocked && <a href="/?saludo=1" target="_blank" rel="noopener noreferrer">Open sign-in with camera</a>}
      {recognized && <button className="primary-btn" type="button" onClick={() => sayCrewGreeting(recognized)}>Play greeting</button>}
    </div>
  )
}

function Login({
  onLogin,
  envId,
  setEnvId,
}: {
  onLogin: (role: Role, crewId?: GreetingCrewId) => void
  envId: string
  setEnvId: (id: string) => void
}) {
  const [mode, setMode] = useState<'bio' | 'credentials'>('bio')
  const env = environments.find((e) => e.id === envId)!

  return (
    <main className="login-shell">
      <div className="stars" />
      <header className="login-header">
        <div className="brand">
          <div className="brand-mark">
            <Orbit />
          </div>
          <div>
            <strong>ATLAS</strong>
            <span>AUTONOMOUS TELEMETRY & LIFE-SUPPORT</span>
          </div>
        </div>
        <div className="secure-chip">
          <ShieldCheck size={14} /> LOCAL SYSTEM · ENCRYPTED
        </div>
      </header>
      <section className="login-grid">
        <div className="login-panel">
          <div className="panel-topline">
            <span>MISSION ACCESS</span>
            <span className="live-dot">SYSTEM ACTIVE</span>
          </div>
          <label className="field-label">OPERATING ENVIRONMENT</label>
          <div className="select-wrap">
            <Orbit size={18} />
            <select value={envId} onChange={(e) => setEnvId(e.target.value)}>
              {environments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
          <p className="env-description">
            <Radiation size={14} /> {env.description}
          </p>
          <div className="mode-tabs">
            <button className={mode === 'bio' ? 'active' : ''} onClick={() => setMode('bio')}>
              <ScanFace size={16} /> Biometrics
            </button>
            <button
              className={mode === 'credentials' ? 'active' : ''}
              onClick={() => setMode('credentials')}
            >
              <LogIn size={16} /> Credentials
            </button>
          </div>
          {mode === 'bio' ? (
            <CrewGreeting onRecognized={onLogin} />
          ) : (
            <div className="credential-form">
              <label className="field-label">STATION ID</label>
              <input defaultValue="EST-ARES-04" />
              <label className="field-label">ACCESS CODE</label>
              <input type="password" defaultValue="12345678" />
              <button className="primary-btn w-full" onClick={() => onLogin('commander')}>
                <LogIn size={18} /> AUTHENTICATE STATION
              </button>
              <div className="demo-label">
                <span /> DEMO ACCESS BY ROLE <span />
              </div>
              <div className="demo-grid">
                {(Object.keys(roleMeta) as Role[]).map((role) => (
                  <button key={role} onClick={() => onLogin(role)}>
                    {roleMeta[role].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <footer>HRP Protocol 4.2 · Data stored on the local node</footer>
        </div>
      </section>
    </main>
  )
}

function Shell({
  children,
  view,
  setView,
  env,
  role,
  onRoleChange,
  onLogout,
  onReport,
  alertCount,
  urgentCount,
  onResetDemo,
}: {
  children: React.ReactNode
  view: View
  setView: (v: View) => void
  env: (typeof environments)[number]
  role: Role
  onRoleChange: (role: Role) => void
  onLogout: () => void
  onReport: () => void
  alertCount: number
  urgentCount: number
  onResetDemo: () => void
}) {
  const [open, setOpen] = useState(false)
  const resetDialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const handleDemoShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && !event.altKey && event.code === 'KeyR') {
        event.preventDefault()
        event.stopPropagation()
        if (!event.repeat && !resetDialogRef.current?.open) resetDialogRef.current?.showModal()
      }
    }
    window.addEventListener('keydown', handleDemoShortcut, true)
    return () => window.removeEventListener('keydown', handleDemoShortcut, true)
  }, [])
  const visibleNavItems = navItems.filter(
    (item) =>
      !(role === 'astronaut' && (item.id === 'manual' || item.id === 'report')) &&
      !(item.id === 'report' && !permissions[role].reports),
  )
  return (
    <div className="app-shell">
      <dialog
        ref={resetDialogRef}
        aria-labelledby="reset-demo-title"
        className="m-auto w-[min(90vw,460px)] rounded-lg border border-cyan-400/30 bg-slate-950 p-6 text-slate-100 backdrop:bg-black/70"
      >
        <h2 id="reset-demo-title" className="text-xl font-semibold">
          Reset demo data?
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          This will erase demo progress and restore the initial data.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            autoFocus
            type="button"
            className="rounded border border-slate-500 px-4 py-2"
            onClick={() => resetDialogRef.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-cyan-300 px-4 py-2 text-slate-950"
            onClick={() => {
              resetDialogRef.current?.close()
              onResetDemo()
            }}
          >
            Reset
          </button>
        </div>
      </dialog>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand sidebar-brand">
          <div className="brand-mark">
            <Orbit />
          </div>
          <div>
            <strong>ATLAS</strong>
            <span>LIFE-SUPPORT HEALTH</span>
          </div>
        </div>
        <nav>
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id)
                setOpen(false)
              }}
              className={view === item.id ? 'active' : ''}
            >
              <item.icon size={18} />
              <span>
                {item.id === 'dashboard' && role === 'astronaut' ? "Crew member" : item.label}
              </span>
              {item.id === 'alerts' && alertCount > 0 && <b>{alertCount}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-card">
            <div>
              <Database size={14} />
              <span>LOCAL NODE</span>
            </div>
            <b>Persistent demo</b>
            <small>Saved in this browser</small>
          </div>
          <div
            className={`user-card role-switcher ${role === 'astronaut' ? 'astronaut-profile' : ''}`}
          >
            <div className="mini-avatar">
              <Image
                src="/atlas-astronaut.jpg"
                alt="Portrait of Emma Jones"
                width={58}
                height={58}
              />
            </div>
            <div>
              <b>Emma Jones</b>
              {role !== 'astronaut' && (
                <select
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value as Role)}
                  aria-label="Change demo role"
                >
                  {(Object.keys(roleMeta) as Role[]).map((item) => (
                    <option value={item} key={item}>
                      View: {roleMeta[item].label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button onClick={onLogout} title="Sign out">
              <LogIn size={14} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(!open)}>
            <Menu />
          </button>
          <div className="telemetry-item mission">
            <span className="pulse-dot" />
            <div>
              <small>ACTIVE MISSION</small>
              <b>{env.short}</b>
            </div>
          </div>
          <div className="telemetry-item">
            <Gauge />
            <div>
              <small>GRAVITY</small>
              <b>{env.gravity}</b>
            </div>
          </div>
          <div className="telemetry-item">
            <Radiation />
            <div>
              <small>RADIATION</small>
              <b>{env.radiation}</b>
            </div>
          </div>
          <div className="telemetry-item">
            <Wifi />
            <div>
              <small>EARTH LINK</small>
              <b>{env.latency}</b>
            </div>
          </div>
          {urgentCount > 0 && (
            <button className="global-alert-chip" onClick={() => setView('alerts')}>
              <ShieldAlert size={15} />
              {urgentCount} alert{urgentCount === 1 ? '' : 's'} urgent
            </button>
          )}
          {permissions[role].reports && (
            <button className="report-btn" onClick={onReport}>
              <FileText size={16} />
              <span>OPEN REPORT</span>
            </button>
          )}
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  warn = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  warn?: boolean
}) {
  return (
    <div className={`metric ${warn ? 'warn' : ''}`}>
      <Icon size={15} />
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{sub}</small>
      </div>
    </div>
  )
}

const taskStatusLabel: Record<TaskStatus, string> = {
  pending: "Pending",
  'in-progress': "In progress",
  processing: "Processing",
  completed: "Completed",
}

function EvaluationGuide({
  task,
  transmission,
  onBack,
  onProcessing,
  onComplete,
  onViewBody,
}: {
  task: CareTask
  transmission?: DemoTransmission
  onBack: () => void
  onProcessing: () => void
  onComplete: (task: CareTask) => void
  onViewBody: (systemId: string) => void
}) {
  const [step, setStep] = useState(0)
  const [screen, setScreen] = useState<'guide' | 'processing' | 'confirmed' | 'result'>(
    task.status === 'completed' ? 'result' : 'guide',
  )
  const processingTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (processingTimer.current) window.clearTimeout(processingTimer.current)
    },
    [],
  )

  const processResult = () => {
    setScreen('processing')
    onProcessing()
    processingTimer.current = window.setTimeout(() => {
      onComplete(task)
      setScreen('confirmed')
    }, 1400)
  }
  const transmissionSteps: Array<{ id: TransmissionStage; label: string }> = [
    { id: 'saved', label: "Saved locally" },
    { id: 'pending', label: "Awaiting transmission" },
    { id: 'sending', label: "Sending" },
    { id: 'received', label: "Received on Earth" },
    { id: 'review', label: "Awaiting review" },
  ]
  const activeTransmissionIndex = transmission
    ? transmissionSteps.findIndex((item) => item.id === transmission.stage)
    : -1

  return (
    <div className="evaluation-page">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to voice interface
      </button>
      <div className="evaluation-shell">
        <header>
          <div>
            <span>PHYSICAL ASSESSMENT · DEMO MODE</span>
            <h2>{task.title}</h2>
          </div>
          <span className={`task-status ${task.status}`}>{taskStatusLabel[task.status]}</span>
        </header>

        {screen === 'guide' && (
          <section className="evaluation-step">
            <div className="step-progress">
              Step {step + 1} of {task.procedure.length}
              <i style={{ width: `${((step + 1) / task.procedure.length) * 100}%` }} />
            </div>
            <div className="evaluation-visual">
              <ClipboardCheck />
            </div>
            <h3>{task.procedure[step]}</h3>
            <p>Approved device procedure · Configured medical plan.</p>
            <button
              className="primary-btn"
              onClick={() =>
                step < task.procedure.length - 1
                  ? setStep((current) => current + 1)
                  : processResult()
              }
            >
              {step < task.procedure.length - 1 ? "Next step" : "Wait for device result"}
              <ArrowRight size={16} />
            </button>
          </section>
        )}

        {screen === 'processing' && (
          <section className="evaluation-state processing">
            <Activity />
            <span>PROCESSING</span>
            <h3>Validating the result received from the device</h3>
            <p>The test is not complete until a valid reading is received.</p>
          </section>
        )}

        {screen === 'confirmed' && (
          <section className="evaluation-state confirmed">
            <Check />
            <span>COMPLETED</span>
            <h3>Assessment complete · Result saved</h3>
            <p>Report added to the Earth transmission queue.</p>
            <button className="primary-btn" onClick={() => setScreen('result')}>
              View result <ArrowRight size={16} />
            </button>
          </section>
        )}

        {screen === 'result' && (
          <section className="evaluation-result">
            <span>VALID RESULT · DEMO MODE</span>
            <h3>{task.result}</h3>
            <p>Saved in Emma Jones's profile and available for medical review.</p>
            {transmission && (
              <div className="transmission-panel">
                <div>
                  <b>Simulated transmission</b>
                  <small>Local node → Earth · Not a live connection</small>
                </div>
                <ol className="transmission-timeline">
                  {transmissionSteps.map((item, index) => (
                    <li
                      key={item.id}
                      className={`${index <= activeTransmissionIndex ? 'complete' : ''} ${
                        item.id === transmission.stage ? 'active' : ''
                      }`}
                    >
                      <i>{index < activeTransmissionIndex ? <Check size={11} /> : index + 1}</i>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <button className="primary-btn" onClick={() => onViewBody(task.systemId)}>
              View in Body Twin <ArrowRight size={16} />
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

function EmotionalAssessments() {
  return (
    <div className="emotional-assessments-page">
      <header className="journey-heading">
        <div>
          <div className="eyebrow"><span /> EMOTIONAL HEALTH</div>
          <h1>Crew well-being</h1>
          <p>Guided check-in with eye observation, reaction practice, and brief screening for depressive symptoms.</p>
        </div>
      </header>
      <iframe
        src="/atlas-bienestar.html"
        allow="camera"
        title="ATLAS well-being assessments"
        style={{ display: 'block', width: '100%', height: 'clamp(520px, 76vh, 760px)', border: '1px solid #2b4b62', borderRadius: 16 }}
      />
    </div>
  )
}

function DemoAlertCenter({
  alerts,
  onOpenSystem,
  onOpenTask,
}: {
  alerts: DemoAlert[]
  onOpenSystem: (systemId: string) => void
  onOpenTask: (taskId: string) => void
}) {
  const taskBySystem: Record<string, string> = {
    cardio: 'blood-pressure',
    neuro: 'rest-reaction-followup',
  }
  return (
    <div className="demo-alerts-page">
      <header className="journey-heading">
        <div>
          <div className="eyebrow">
            <span /> ALERT CENTER · DEMO SCENARIO
          </div>
          <h1>Follow-up needed</h1>
          <p>
            Only situations with assigned follow-up appear here. Exercise remains a task.
          </p>
        </div>
        <div className="journey-count">
          <b>{alerts.length}</b>
          <span>active follow-ups</span>
        </div>
      </header>
      <section className="demo-alert-list">
        {alerts.map((item) => (
          <article className={item.status} key={item.id}>
            <div className="alert-marker">
              <AlertTriangle />
            </div>
            <div>
              <span>{item.status === 'urgent' ? "URGENT" : "ATTENTION"}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <small>
                Illustrative scenario rule; awaiting review, without a diagnosis.
              </small>
            </div>
            <div className="demo-alert-actions">
              <button onClick={() => onOpenSystem(item.systemId)}>View in Body Twin</button>
              {taskBySystem[item.systemId] && (
                <button
                  className="primary-btn"
                  onClick={() => onOpenTask(taskBySystem[item.systemId])}
                >
                  View activity
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

type BodyZoneState = Status | 'informational'
type BodyZone = {
  label: string
  state: BodyZoneState
  stateLabel: string
  measurements: string[]
  occurs: string
  action: string
  source: string
  technical: string
  taskId?: string
  buttonLabel?: string
}

function AnatomicalBodyModel({
  zones,
  selected,
  onSelect,
}: {
  zones: Record<string, BodyZone>
  selected: string
  onSelect: (id: string) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const sendSelection = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'atlas-body-select',
          zone: selected,
          states: Object.fromEntries(Object.entries(zones).map(([id, item]) => [id, item.state])),
        },
        window.location.origin,
      )
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'atlas-body-ready') {
        setReady(true)
        sendSelection()
      } else if (event.data?.type === 'atlas-body-unavailable') {
        setFailed(true)
      } else if (
        event.data?.type === 'atlas-body-picked' &&
        typeof event.data.zone === 'string' &&
        Object.hasOwn(zones, event.data.zone)
      ) {
        onSelect(event.data.zone)
      }
    }
    window.addEventListener('message', onMessage)
    sendSelection()
    return () => window.removeEventListener('message', onMessage)
  }, [onSelect, selected, zones])

  useEffect(() => {
    if (ready) return
    const timeout = window.setTimeout(() => setFailed(true), 15000)
    return () => window.clearTimeout(timeout)
  }, [ready])

  if (failed) return <AnatomicalBodySvg zones={zones} selected={selected} onSelect={onSelect} />
  return (
    <iframe
      ref={frame}
      src="/body-twin-model.html"
      title="Interactive 3D anatomy model"
      style={{ display: 'block', width: '100%', height: 'clamp(360px, 55vh, 520px)', border: 0, borderRadius: 12 }}
    />
  )
}

function AnatomicalBodySvg({
  zones,
  selected,
  onSelect,
}: {
  zones: Record<string, BodyZone>
  selected: string
  onSelect: (id: string) => void
}) {
  const zoneProps = (id: string) => ({
    className: `body-organ ${id} ${zones[id].state} ${selected === id ? 'selected' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': `${zones[id].label}: ${zones[id].stateLabel}`,
    onClick: () => onSelect(id),
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
      if (event.key === 'Enter' || event.key === ' ') onSelect(id)
    },
  })

  return (
    <svg
      className="anatomical-demo-svg"
      viewBox="0 0 240 520"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Interactive body model"
    >
      <defs>
        <filter id="bodyGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        {...zoneProps('radiation')}
        className={`${zoneProps('radiation').className} radiation-outline`}
      >
        <circle cx="120" cy="49" r="34" />
        <path d="M96 84 C79 92 72 121 70 157 L50 273 C47 287 58 292 65 280 L88 183 L90 286 L76 464 C75 485 91 489 97 469 L120 318 L143 469 C149 489 165 485 164 464 L150 286 L152 183 L175 280 C182 292 193 287 190 273 L170 157 C168 121 161 92 144 84 Z" />
      </g>
      <g className="body-base">
        <circle cx="120" cy="49" r="30" />
        <path d="M99 82 C82 90 78 119 78 156 L91 283 L83 463 C82 478 94 482 99 466 L120 315 L141 466 C146 482 158 478 157 463 L149 283 L162 156 C162 119 158 90 141 82 Z" />
        <path d="M82 110 L55 271 M158 110 L185 271" />
      </g>
      <g {...zoneProps('neuro')}>
        <path d="M102 42 C101 28 111 22 120 27 C130 21 141 31 138 43 C143 52 135 61 126 58 C119 65 108 59 109 53 C101 53 97 47 102 42 Z" />
        <path d="M111 31 C116 37 113 45 119 49 M129 29 C124 37 130 43 125 55" />
      </g>
      <g {...zoneProps('respiratory')}>
        <path d="M113 103 C97 106 90 121 92 150 C94 169 105 174 114 162 Z" />
        <path d="M127 103 C143 106 150 121 148 150 C146 169 135 174 126 162 Z" />
        <path d="M120 88 L120 116 M120 105 L110 119 M120 105 L130 119" />
      </g>
      <g {...zoneProps('cardio')}>
        <path d="M120 137 C111 125 98 132 101 145 C104 157 120 168 120 168 C120 168 136 157 139 145 C142 132 129 125 120 137 Z" />
        <path d="M120 169 L120 248 M120 188 L93 221 M120 188 L147 221" />
      </g>
      <g {...zoneProps('digestive')}>
        <path d="M98 183 C105 174 130 176 142 188 C151 198 146 224 132 235 C119 244 96 231 94 211 C93 200 94 190 98 183 Z" />
        <path d="M105 194 C128 188 137 202 126 213 C116 223 105 213 113 205 C121 198 133 217 118 229" />
      </g>
      <g {...zoneProps('muscular')}>
        <path d="M89 279 L120 303 L151 279 M120 303 L120 390 M120 335 L95 458 M120 335 L145 458" />
        <path d="M84 132 L65 267 M156 132 L175 267 M98 106 L91 171 M142 106 L149 171" />
        <circle cx="120" cy="303" r="9" />
      </g>
    </svg>
  )
}

function BodyTwinOverview({
  member,
  snapshot,
  tasks,
  selectedSystem,
  onSelectSystem,
  onJourney,
}: {
  member: CrewMember
  snapshot: MeasurementSnapshot
  tasks: CareTask[]
  selectedSystem: string
  onSelectSystem: (id: string) => void
  onJourney: (taskId?: string) => void
}) {
  const m = snapshot.measurements
  const pressureCompleted = tasks.some(
    (task) => task.id === 'blood-pressure' && task.status === 'completed',
  )
  const zones: Record<string, BodyZone> = {
    neuro: {
      label: "Neurological",
      state: 'warning',
      stateLabel: "Follow-up needed in this scenario",
      measurements: [`Sleep: ${m.sleep} h`, `Reaction time: ${m.reaction} ms · Demo reference 280 ms`],
      occurs: "Rest and reaction testing require follow-up in this scenario.",
      action: "Review the follow-up activity in the medical plan.",
      source: "Compatible body sensor + demo cognitive test",
      technical:
        "Demo rule: follow-up when sleep is below 7 h or reaction time exceeds 300 ms.",
      taskId: 'rest-reaction-followup',
      buttonLabel: "View pending assessment",
    },
    respiratory: {
      label: "Respiratory",
      state: 'optimal',
      stateLabel: "No alerts in this scenario",
      measurements: [
        `Oxygenation: ${m.spo2}%`,
        `Respiratory rate: ${m.respiratoryRate} resp/min`,
      ],
      occurs: "No respiratory alerts in the demo data.",
      action: "Continue scheduled monitoring.",
      source: "Compatible body sensor + respiratory sensor",
      technical: "Demo rule: no alert with SpO₂ ≥ 97% and a rate between 12 and 20 breaths/min.",
    },
    cardio: {
      label: 'Cardiovascular',
      state: 'warning',
      stateLabel: "Follow-up needed in this scenario",
      measurements: [`Heart rate: ${m.hr} bpm`, `Blood pressure: ${m.systolic}/${m.diastolic} mmHg`],
      occurs: pressureCompleted
        ? "Result awaiting review"
        : "The blood pressure reading is flagged for review.",
      action: pressureCompleted
        ? "The repeat reading has been saved. View the result and review status."
        : "Repeat the measurement following the blood pressure monitor protocol.",
      source: "Compatible body sensor + blood pressure monitor",
      technical: "Demo rule: review when blood pressure is at or above 140/90 mmHg.",
      taskId: 'blood-pressure',
      buttonLabel: pressureCompleted ? "View result" : "View pending assessment",
    },
    digestive: {
      label: "Metabolic",
      state: 'optimal',
      stateLabel: "No alerts in this scenario",
      measurements: [`Fasting glucose: ${m.glucose} mg/dL`, `Temperature: ${m.temp} °C`],
      occurs: "No alerts in these demo measurements.",
      action: "Continue the scheduled plan.",
      source: "Analyzer + thermometer",
      technical:
        "Glucose is shown as a metabolic measurement; it does not directly describe the liver or stomach.",
    },
    muscular: {
      label: "Musculoskeletal",
      state: m.exercise! < m.exerciseGoal! ? 'warning' : 'optimal',
      stateLabel: m.exercise! < m.exerciseGoal! ? "Activity pending" : "Goal completed",
      measurements: [`Exercise: ${m.exercise}/${m.exerciseGoal} min`],
      occurs:
        m.exercise! < m.exerciseGoal!
          ? "The scheduled activity is not yet complete."
          : "The scheduled activity is complete.",
      action: "Complete the remaining time following the resistance device instructions.",
      source: "Resistance device",
      technical: "This is a demo plan task; it does not indicate an injury or a structural measurement.",
      taskId: 'medical-exercise',
      buttonLabel: "View activity",
    },
    radiation: {
      label: "Radiation",
      state: 'informational',
      stateLabel: "Informational record",
      measurements: [`Latest day: ${m.dailyDose} mSv`, `Cumulative dose: ${m.radiation} mSv`],
      occurs: "Exposure record available.",
      action: "No action is assigned without a configured protocol.",
      source: "Dosimeter",
      technical:
        "The cyan outline represents recorded exposure. It does not indicate organ damage or clinical severity.",
    },
  }
  const zone = zones[selectedSystem] ?? zones.cardio
  const capturedAt = new Date(snapshot.receivedAt).toLocaleString('en-US')

  return (
    <div className="body-overview-page">
      <header className="journey-heading">
        <div>
          <div className="eyebrow">
            <span /> BODY TWIN · {member.name}
          </div>
          <h1>Results and next steps</h1>
          <p>Select an organ or use the accessible system buttons.</p>
        </div>
        <span className="demo-chip">DEMO MODE</span>
      </header>
      <div className="body-overview-layout">
        <section className="body-zone-map">
          <div className="body-silhouette">
            <AnatomicalBodyModel zones={zones} selected={selectedSystem} onSelect={onSelectSystem} />
            <span>SELECTED AREA · {zone.label.toUpperCase()}</span>
          </div>
          <div className="body-zone-list">
            {Object.entries(zones).map(([id, item]) => (
              <button
                key={id}
                className={`${selectedSystem === id ? 'active' : ''} ${item.state}`}
                onClick={() => onSelectSystem(id)}
              >
                <i />
                <span>{item.label}</span>
                <b>{item.stateLabel}</b>
              </button>
            ))}
          </div>
          <div className="body-legend">
            <span className="optimal">Green · No demo alerts</span>
            <span className="warning">Yellow · Follow-up needed</span>
            <span className="critical">Red · Urgent</span>
            <span style={{ color: '#98a4b3' }}>Gray · No data</span>
            <span className="informational">Cyan · Exposure information</span>
          </div>
        </section>
        <section className={`body-action-panel ${zone.state}`}>
          <div className="body-status-line">
            <i />
            <span>{zone.stateLabel}</span>
          </div>
          <div>
            <span>KEY MEASUREMENTS</span>
            <div className="zone-measurements">
              {zone.measurements.map((measurement) => (
                <b key={measurement}>{measurement}</b>
              ))}
            </div>
          </div>
          <div>
            <span>WHAT IS HAPPENING</span>
            <h2>{zone.occurs}</h2>
          </div>
          <div>
            <span>WHAT TO DO</span>
            <p>{zone.action}</p>
          </div>
          {zone.taskId && zone.buttonLabel && (
            <div>
              <span>NEXT ACTION</span>
              <button className="primary-btn" onClick={() => onJourney(zone.taskId)}>
                {zone.buttonLabel} <ArrowRight size={16} />
              </button>
            </div>
          )}
          <details className="body-details">
            <summary>View details</summary>
            <dl>
              <div>
                <dt>Source</dt>
                <dd>{zone.source}</dd>
              </div>
              <div>
                <dt>Capture</dt>
                <dd>{capturedAt}</dd>
              </div>
              <div>
                <dt>History</dt>
                <dd>7 fixed days · Last point matches the current value</dd>
              </div>
            </dl>
            <p>{zone.technical}</p>
            <small>
              Illustrative demo rules; these are not validated clinical thresholds.
            </small>
          </details>
        </section>
      </div>
    </div>
  )
}

function Dashboard({
  crew,
  role,
  activeId,
  onActiveChange,
  sensorConnection,
  sensorSnapshot,
}: {
  crew: CrewMember[]
  role: Role
  activeId: string
  onActiveChange: (member: CrewMember) => void
  sensorConnection: SensorConnection
  sensorSnapshot: MeasurementSnapshot
}) {
  const activeMember = crew.find((member) => member.id === activeId) ?? crew[0]
  const measurements = sensorSnapshot.measurements
  const chartData = sensorSnapshot.history ?? []
  type IndicatorState = Status | 'informational'
  const kpis: Array<{
    id: string
    label: string
    icon: typeof HeartPulse
    value: number | string | null | undefined
    unit: string
    source: string
    state: IndicatorState
  }> = [
    {
      id: 'hr',
      label: "Heart rate",
      icon: HeartPulse,
      value: measurements.hr,
      unit: "bpm",
      source: "Compatible body sensor",
      state: 'optimal',
    },
    {
      id: 'bp',
      label: "Blood pressure",
      icon: Activity,
      value: `${measurements.systolic}/${measurements.diastolic}`,
      unit: 'mmHg',
      source: "Blood pressure monitor",
      state: 'warning',
    },
    {
      id: 'spo2',
      label: "Oxygenation",
      icon: Droplets,
      value: measurements.spo2,
      unit: '%',
      source: "Compatible body sensor",
      state: 'optimal',
    },
    {
      id: 'respiration',
      label: "Breathing",
      icon: Wind,
      value: measurements.respiratoryRate,
      unit: 'resp/min',
      source: "Respiratory sensor",
      state: 'optimal',
    },
    {
      id: 'temperature',
      label: "Temperature",
      icon: Thermometer,
      value: measurements.temp,
      unit: '°C',
      source: "Thermometer",
      state: 'optimal',
    },
    {
      id: 'glucose',
      label: "Glucose",
      icon: BarChart3,
      value: measurements.glucose,
      unit: 'mg/dL',
      source: "Analyzer",
      state: 'optimal',
    },
    {
      id: 'sleep',
      label: "Sleep",
      icon: Moon,
      value: measurements.sleep,
      unit: 'h',
      source: "Compatible body sensor",
      state: 'warning',
    },
    {
      id: 'reaction',
      label: "Demo reaction time",
      icon: Brain,
      value: measurements.reaction,
      unit: 'ms',
      source: "Demo cognitive test",
      state: 'warning',
    },
    {
      id: 'exercise',
      label: "Exercise",
      icon: Dumbbell,
      value: `${measurements.exercise}/${measurements.exerciseGoal}`,
      unit: 'min',
      source: "Resistance device",
      state: measurements.exercise! < measurements.exerciseGoal! ? 'warning' : 'optimal',
    },
    {
      id: 'daily-dose',
      label: "Daily dosimetry",
      icon: Radiation,
      value: measurements.dailyDose,
      unit: 'mSv',
      source: "Dosimeter",
      state: 'informational',
    },
    {
      id: 'radiation',
      label: "Cumulative dose",
      icon: Radiation,
      value: measurements.radiation,
      unit: 'mSv',
      source: "Dosimeter",
      state: 'informational',
    },
  ]
  const statusText: Record<IndicatorState, string> = {
    optimal: "NO DEMO ALERTS",
    warning: "ATTENTION",
    critical: "URGENT",
    informational: "INFORMATIONAL",
  }

  return (
    <div className="biometric-dashboard">
      <section className="active-profile">
        <div className="profile-identity">
          <Avatar member={activeMember} large photo />
          <div>
            <div className="eyebrow">
              <span /> CREW MEMBER · DEMO
            </div>
            <h2>{activeMember.name}</h2>
            <p>
              {activeMember.role} <i /> Consistent fictional data <i /> 7 days
            </p>
          </div>
        </div>
        <div className="profile-state attention">
          <span>OVERALL STATUS</span>
          <StatusPill status="warning" />
          <small>Follow-up needed: blood pressure and rest/reaction</small>
        </div>
        {role === 'cmo' && crew.length > 1 && (
          <label className="patient-selector">
            <span>PATIENT UNDER MONITORING</span>
            <div>
              <Stethoscope size={16} />
              <select
                value={activeMember.id}
                onChange={(event) =>
                  onActiveChange(
                    crew.find((member) => member.id === event.target.value) ?? activeMember,
                  )
                }
              >
                {crew.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        )}
      </section>

      <section className="health-monitoring-strip">
        <div className="monitoring-title">
          <span>HEALTH MONITORING</span>
          <b>Persistent illustrative scenario</b>
        </div>
        <div className={`monitoring-source ${sensorConnection}`}>
          <i />
          <div>
            <span>DEMO SOURCES</span>
            <b>Connected · Simulated</b>
            <small>Sensors and devices identified for each indicator</small>
          </div>
        </div>
        <div className="monitoring-reading">
          <Clock3 size={15} />
          <div>
            <span>LATEST CAPTURE</span>
            <b>{new Date(sensorSnapshot.receivedAt).toLocaleString('en-US')}</b>
            <small>Local storage · Not real hardware</small>
          </div>
        </div>
      </section>

      <div className="dashboard-section-title">
        <div>
          <span>01 · SHARED INDICATORS</span>
          <h3>Latest fictional measurements</h3>
        </div>
        <p className="demo-rule-note">
          Colors are defined for this demo scenario; they are not validated clinical thresholds.
        </p>
      </div>
      <section className="kpi-row demo-kpis">
        {kpis.map((kpi) => (
          <article className={`clinical-kpi ${kpi.state}`} key={kpi.id}>
            <div className="kpi-top">
              <div className="kpi-icon">
                <kpi.icon />
              </div>
              <span className={`scenario-state ${kpi.state}`}>{statusText[kpi.state]}</span>
            </div>
            <span>{kpi.label}</span>
            <div className="kpi-reading">
              <b>{kpi.value ?? '—'}</b>
              {kpi.value != null && <em>{kpi.unit}</em>}
            </div>
            <div className="kpi-baseline">
              <span>{kpi.source}</span>
              <strong>RECEIVED</strong>
            </div>
          </article>
        ))}
      </section>

      <div className="dashboard-section-title charts-title">
        <div>
          <span>02 · FIXED HISTORY</span>
          <h3>Seven days · Last point matches the current value</h3>
        </div>
      </div>
      <section className="biometric-charts">
        <article className="bio-chart">
          <div className="bio-chart-head">
            <div>
              <span>CARDIOVASCULAR</span>
              <h3>Heart rate and blood pressure</h3>
            </div>
            <HeartPulse />
          </div>
          <div className="chart-key">
            <span>
              <i className="cyan" />
              Heart rate (bpm)
            </span>
            <span>
              <i className="violet" />
              Blood pressure (mmHg)
            </span>
          </div>
          <div className="bio-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#213142" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis yAxisId="pulse" domain={[60, 90]} tick={{ fill: '#657a8e', fontSize: 9 }} />
                <YAxis
                  yAxisId="pressure"
                  orientation="right"
                  domain={[70, 155]}
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0b1722',
                    border: '1px solid #2b4152',
                    fontSize: 10,
                  }}
                />
                <Line
                  yAxisId="pulse"
                  type="monotone"
                  dataKey="hr"
                  stroke="#55dff0"
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="systolic"
                  stroke="#b278f4"
                  strokeWidth={2.2}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#f2bd5b"
                  strokeWidth={1.8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="bio-chart">
          <div className="bio-chart-head">
            <div>
              <span>NEUROLOGICAL</span>
              <h3>Sleep and demo reaction time</h3>
            </div>
            <Brain />
          </div>
          <div className="chart-key">
            <span>
              <i className="cyan" />
              Sleep (h)
            </span>
            <span>
              <i className="amber" />
              Reaction time (ms)
            </span>
          </div>
          <div className="bio-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#213142" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis yAxisId="sleep" domain={[0, 10]} tick={{ fill: '#657a8e', fontSize: 9 }} />
                <YAxis
                  yAxisId="reaction"
                  orientation="right"
                  domain={[250, 340]}
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0b1722',
                    border: '1px solid #2b4152',
                    fontSize: 10,
                  }}
                />
                <Bar
                  yAxisId="sleep"
                  dataKey="sleep"
                  fill="#55dff0"
                  fillOpacity={0.72}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="reaction"
                  type="monotone"
                  dataKey="reaction"
                  stroke="#f2bd5b"
                  strokeWidth={2.2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="bio-chart">
          <div className="bio-chart-head">
            <div>
              <span>MUSCULOSKELETAL</span>
              <h3>Resistance activity</h3>
            </div>
            <Dumbbell />
          </div>
          <div className="chart-key">
            <span>
              <i className="cyan" />
              Completed (min)
            </span>
            <span>
              <i className="target" />
              Goal (min)
            </span>
          </div>
          <div className="bio-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#213142" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 35]} tick={{ fill: '#657a8e', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    background: '#0b1722',
                    border: '1px solid #2b4152',
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="exerciseGoal" fill="#34495c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="exercise" fill="#55dff0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="bio-chart">
          <div className="bio-chart-head">
            <div>
              <span>METABOLIC · DOSIMETRY</span>
              <h3>Glucose and cumulative exposure</h3>
            </div>
            <Radiation />
          </div>
          <div className="chart-key">
            <span>
              <i className="cyan" />
              Glucose (mg/dL)
            </span>
            <span>
              <i className="violet" />
              Cumulative (mSv)
            </span>
          </div>
          <div className="bio-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#213142" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="glucose"
                  domain={[80, 105]}
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                />
                <YAxis
                  yAxisId="radiation"
                  orientation="right"
                  domain={[17, 19]}
                  tick={{ fill: '#657a8e', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0b1722',
                    border: '1px solid #2b4152',
                    fontSize: 10,
                  }}
                />
                <Line
                  yAxisId="glucose"
                  type="monotone"
                  dataKey="glucose"
                  stroke="#55dff0"
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="radiation"
                  type="monotone"
                  dataKey="radiation"
                  stroke="#b278f4"
                  strokeWidth={2.3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  )
}

function systemStatus(id: string, member: CrewMember, phase: number, scenario: Scenario): Status {
  if (scenario === 'emergency' && ['cardio', 'respiratory', 'digestive'].includes(id))
    return 'critical'
  if (member.status === 'critical' && ['cardio', 'respiratory'].includes(id)) return 'critical'
  if (scenario === 'gradual' && ['neuro', 'digestive', 'muscular', 'radiation'].includes(id))
    return 'warning'
  if (phase === 3 && ['cardio', 'neuro', 'muscular'].includes(id)) return 'warning'
  if (phase === 4 && ['radiation', 'neuro', 'digestive'].includes(id)) return 'warning'
  if (phase === 5 && ['cardio', 'muscular'].includes(id)) return 'critical'
  if (id === 'radiation' && phase >= 2) return 'warning'
  if (member.status === 'warning' && ['cardio', 'neuro', 'muscular'].includes(id)) return 'warning'
  return 'optimal'
}

const systemColor = (status: Status) =>
  status === 'critical' ? '#ff5665' : status === 'warning' ? '#f2bd5b' : '#42d7a6'

const hazardCatalog = [
  { id: 'radiation', name: "Ionizing radiation", detail: "GCR · SPE · Neutrons" },
  { id: 'gravity', name: "Altered gravity", detail: "0 G · Transition · 3/8 G" },
  { id: 'isolation', name: "Isolation and confinement", detail: "Psychosocial load" },
  { id: 'distance', name: "Distance from Earth", detail: "Autonomy · Latency" },
  { id: 'closed', name: "Hostile and enclosed environment", detail: "CO₂ · Air · Circadian rhythm" },
] as const

const hazardsBySystem: Record<string, string[]> = {
  neuro: ['gravity', 'closed', 'isolation', 'radiation'],
  respiratory: ['closed', 'gravity', 'distance'],
  cardio: ['gravity', 'radiation', 'closed', 'isolation'],
  digestive: ['closed', 'isolation', 'gravity', 'distance'],
  muscular: ['gravity', 'radiation', 'closed'],
  radiation: ['radiation', 'distance', 'closed'],
}

function AnatomicalFigure({
  selected,
  onSelect,
  member,
  phase,
  scenario,
}: {
  selected: string
  onSelect: (id: string) => void
  member: CrewMember
  phase: number
  scenario: Scenario
}) {
  const color = (id: string) => systemColor(systemStatus(id, member, phase, scenario))
  const cls = (id: string) =>
    `${systemStatus(id, member, phase, scenario)}${selected === id ? ' selected' : ''}`
  return (
    <div className="anatomy-viewer">
      <div className="scan-readout">
        <span>ATLAS BIO-SCAN</span>
        <b>LIVE · 42 LAYERS</b>
      </div>
      <svg viewBox="0 0 430 690" aria-label="Interactive holographic human anatomy">
        <defs>
          <radialGradient id="atlasBody" cx="50%" cy="40%">
            <stop stopColor="#2d5365" stopOpacity=".75" />
            <stop offset="1" stopColor="#102532" stopOpacity=".82" />
          </radialGradient>
          <filter id="atlasGlow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="scanGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#4cd8e8"
              strokeOpacity=".08"
              strokeWidth=".7"
            />
          </pattern>
        </defs>
        <rect
          x="8"
          y="8"
          width="414"
          height="674"
          rx="8"
          fill="url(#scanGrid)"
          stroke="#315365"
          strokeDasharray="3 6"
        />
        <g
          className={`ion-aura ${cls('radiation')}`}
          onClick={() => onSelect('radiation')}
          role="button"
          tabIndex={0}
        >
          <ellipse
            cx="215"
            cy="351"
            rx="126"
            ry="310"
            fill="none"
            stroke={color('radiation')}
            strokeWidth="1.5"
          />
          <ellipse
            cx="215"
            cy="351"
            rx="143"
            ry="326"
            fill="none"
            stroke={color('radiation')}
            strokeOpacity=".45"
            strokeDasharray="4 10"
          />
          <ellipse
            cx="215"
            cy="351"
            rx="159"
            ry="338"
            fill="none"
            stroke={color('radiation')}
            strokeOpacity=".18"
          />
          {[55, 91, 132, 286, 338, 375].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={90 + i * 92}
              r={i % 2 ? 3 : 2}
              fill={color('radiation')}
              className="ion-particle"
            />
          ))}
        </g>
        <g className="human-shell" pointerEvents="none">
          <path
            d="M187 120C151 130 139 162 141 210L132 322 151 328 170 225 173 365 151 535 177 631 204 625 215 443 226 625 253 631 279 535 257 365 260 225 279 328 298 322 289 210C291 162 279 130 243 120Z"
            fill="url(#atlasBody)"
            stroke="#7292a3"
            strokeWidth="1.6"
          />
          <path
            d="M174 365Q215 388 256 365M165 225Q215 245 265 225"
            fill="none"
            stroke="#7894a3"
            strokeOpacity=".35"
          />
          <path
            d="M182 118Q159 92 166 62Q171 24 215 20Q259 24 264 62Q271 92 248 118Z"
            fill="url(#atlasBody)"
            stroke="#7292a3"
            strokeWidth="1.8"
          />
        </g>
        <g
          className={`organ brain-organ ${cls('neuro')}`}
          onClick={() => onSelect('neuro')}
          role="button"
          tabIndex={0}
          filter="url(#atlasGlow)"
        >
          <path
            d="M183 66C174 50 187 35 201 41C207 27 229 30 232 43C249 41 255 61 244 72C248 87 230 98 218 88C207 101 190 92 191 82C178 84 172 74 183 66Z"
            fill={color('neuro')}
            fillOpacity=".72"
            stroke={color('neuro')}
          />
          <path
            d="M196 43c-8 12 4 18-3 29m19-35c-5 12 5 17 0 28m18-21c8 8-3 18 5 27m-35 5c9-7 18 5 26-3"
            fill="none"
            stroke="#dffaff"
            strokeOpacity=".55"
          />
          <path
            d="M202 83L190 104M227 83L239 104M190 104h49"
            fill="none"
            stroke={color('neuro')}
            strokeWidth="2"
          />
        </g>
        <g
          className={`organ lungs-organ ${cls('respiratory')}`}
          onClick={() => onSelect('respiratory')}
          role="button"
          tabIndex={0}
          filter="url(#atlasGlow)"
        >
          <path
            d="M210 142V176M210 160L191 176M210 160L232 176"
            fill="none"
            stroke={color('respiratory')}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M191 170C167 174 158 206 163 249C168 275 191 274 204 252L205 180C201 173 196 170 191 170Z"
            fill={color('respiratory')}
            fillOpacity=".48"
            stroke={color('respiratory')}
            strokeWidth="1.6"
          />
          <path
            d="M231 170C255 174 264 206 259 249C254 275 231 274 218 252L217 180C221 173 226 170 231 170Z"
            fill={color('respiratory')}
            fillOpacity=".48"
            stroke={color('respiratory')}
            strokeWidth="1.6"
          />
          <path
            d="M190 184c-12 14-14 35-12 62m55-62c12 14 14 35 12 62"
            fill="none"
            stroke="#dffaff"
            strokeOpacity=".25"
          />
        </g>
        <g
          className={`organ heart-organ ${cls('cardio')}`}
          onClick={() => onSelect('cardio')}
          role="button"
          tabIndex={0}
          style={{ '--beat': `${Math.max(0.42, 60 / member.current.hr)}s` } as React.CSSProperties}
          filter="url(#atlasGlow)"
        >
          <path
            d="M212 205C197 185 180 202 187 221C192 239 214 254 214 254C214 254 239 237 243 216C247 197 225 188 212 205Z"
            fill={color('cardio')}
            stroke="#ffd8db"
            strokeOpacity=".4"
          />
          <path
            d="M210 202V179M218 203l12-23M204 205l-9-21"
            fill="none"
            stroke={color('cardio')}
            strokeWidth="4"
          />
          <path
            d="M214 252v74M209 258l-31 81M220 257l30 82"
            fill="none"
            stroke={color('cardio')}
            strokeWidth="2"
            strokeOpacity=".65"
          />
        </g>
        <g
          className={`organ digestive-organ ${cls('digestive')}`}
          onClick={() => onSelect('digestive')}
          role="button"
          tabIndex={0}
          filter="url(#atlasGlow)"
        >
          <path
            d="M177 286C186 269 224 269 244 282C245 302 228 313 203 310C181 308 168 301 177 286Z"
            fill={color('digestive')}
            fillOpacity=".68"
            stroke={color('digestive')}
          />
          <path
            d="M233 309C255 303 258 327 244 341C235 352 217 342 220 327C222 318 226 312 233 309Z"
            fill="#7be1ba"
            fillOpacity=".62"
            stroke={color('digestive')}
          />
          <path
            d="M184 330c-11 6-9 20 2 24-12 8-8 22 3 24-8 10-1 20 10 18m31-67c12 7 9 19-1 25 12 7 8 20-3 24 9 11 1 20-10 18M192 339h29M191 360h34M196 381h22"
            fill="none"
            stroke={color('digestive')}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
        <g
          className={`organ skeleton-organ ${cls('muscular')}`}
          onClick={() => onSelect('muscular')}
          role="button"
          tabIndex={0}
        >
          <path
            d="M215 118v65M178 150l-23 111M252 150l23 111M215 395l-34 145-5 76M215 395l34 145 5 76"
            fill="none"
            stroke={color('muscular')}
            strokeWidth="7"
            strokeLinecap="round"
            opacity=".72"
          />
          <path
            d="M181 184q34 22 68 0M173 202q42 24 84 0M169 220q46 25 92 0M193 395h44M181 540l19 4M249 540l-19 4"
            fill="none"
            stroke={color('muscular')}
            strokeWidth="3"
            opacity=".65"
          />
          <circle cx="215" cy="394" r="10" fill="none" stroke={color('muscular')} strokeWidth="3" />
        </g>
        <g className="anatomy-labels">
          {[
            ['neuro', 180, 76, 50, 62, "BRAIN · SANS"],
            ['respiratory', 164, 205, 47, 190, `LUNGS · SpO₂ ${member.current.spo2}%`],
            ['cardio', 239, 220, 378, 204, `HEART · ${member.current.hr} BPM`],
            ['digestive', 246, 334, 382, 340, `METABOLISM · ${member.current.glucose} MG/DL`],
            ['muscular', 181, 535, 48, 551, "BONE · MUSCLE"],
            ['radiation', 319, 470, 387, 484, `${member.current.radiation} mSv · Dosimeter`],
          ].map(([id, x1, y1, x2, y2, text]) => (
            <g
              key={String(id)}
              className={selected === id ? 'selected' : ''}
              onClick={() => onSelect(String(id))}
              role="button"
              tabIndex={0}
            >
              <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={color(String(id))} fill="none" />
              <circle cx={Number(x1)} cy={Number(y1)} r="3" fill={color(String(id))} />
              <text
                x={Number(x2)}
                y={Number(y2) - 6}
                textAnchor={Number(x2) > 215 ? 'end' : 'start'}
                fill={color(String(id))}
              >
                {text}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="scan-line anatomy-scan-line" />
      <div className="viewer-footer">
        <span>FRONT · ANATOMICAL LAYER</span>
        <b>Radiation: {member.current.radiation} mSv</b>
      </div>
    </div>
  )
}

function ExamModal({
  exam,
  onClose,
  onSubmit,
}: {
  exam: string
  onClose: () => void
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div className="modal-backdrop">
      <div className="exam-modal">
        <div className="exam-modal-head">
          <div>
            <span>ATLAS · AUTOMATED CLINICAL ORDER</span>
            <h3>{exam}</h3>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="exam-guide">
          <FlaskConical />
          <div>
            <b>Perform the exam with the onboard medical kit</b>
            <span>
              ATLAS will include the result in the multicausal matrix before escalating the case.
            </span>
          </div>
        </div>
        <label>
          <span>RESULT / STRUCTURED OBSERVATION</span>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter the exam value, unit, and observations…"
          />
        </label>
        <label className="exam-upload">
          <UploadCloud />
          <div>
            <b>Attach device evidence</b>
            <span>Image, test strip, or device export</span>
          </div>
          <input type="file" />
        </label>
        <button className="primary-btn" disabled={!value.trim()} onClick={() => onSubmit(value)}>
          ADD RESULT TO CASE
        </button>
      </div>
    </div>
  )
}

function MachineExamModal({
  exam,
  result,
  onClose,
  onStatus,
}: {
  exam: string
  result: string
  onClose: () => void
  onStatus: (status: ExamTransmission) => void
}) {
  const [phase, setPhase] = useState<'connecting' | 'running' | 'complete'>('connecting')
  const [transmission, setTransmission] = useState<ExamTransmission | null>(null)
  const onCloseRef = useRef(onClose)
  const onStatusRef = useRef(onStatus)

  useEffect(() => {
    onCloseRef.current = onClose
    onStatusRef.current = onStatus
  }, [onClose, onStatus])

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase('running'), 900),
      window.setTimeout(() => {
        setPhase('complete')
        setTransmission('pending')
        onStatusRef.current('pending')
      }, 2400),
      window.setTimeout(() => {
        setTransmission('sending')
        onStatusRef.current('sending')
      }, 3300),
      window.setTimeout(() => {
        setTransmission('sent')
        onStatusRef.current('sent')
      }, 4400),
      window.setTimeout(() => onCloseRef.current(), 5400),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [result])

  const phaseLabel = {
    connecting: "Connecting to the medical device…",
    running: "Capturing and validating measurements…",
    complete: "Exam complete · Results saved",
  }[phase]
  const transmissionLabel = transmission
    ? {
        pending: "Awaiting connection",
        sending: "Sending",
        sent: "Sent to Earth",
      }[transmission]
    : "Preparing clinical package"

  return (
    <div className="modal-backdrop">
      <div className="exam-modal machine-exam-modal">
        <div className="exam-modal-head">
          <div>
            <span>ATLAS · AUTOMATED CAPTURE</span>
            <h3>{exam}</h3>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className={`machine-exam-stage ${phase}`}>
          {phase === 'complete' ? <Check /> : <Activity />}
          <div>
            <b>{phaseLabel}</b>
            <span>
              {phase === 'complete'
                ? result
                : "No manual upload is required. ATLAS records the device output."}
            </span>
          </div>
        </div>
        <div className={`machine-transmission ${transmission ?? 'preparing'}`}>
          <Radio />
          <div>
            <span>AUTOMATED MEDICAL REPORT</span>
            <b>{transmissionLabel}</b>
          </div>
          <small>DEMO MODE</small>
        </div>
      </div>
    </div>
  )
}

function BodyTwin({
  member,
  onBack,
  phase,
  scenario,
  role,
  earthLatency,
  examReports,
  onExamReport,
}: {
  member: CrewMember
  onBack: () => void
  phase: number
  scenario: Scenario
  role: Role
  earthLatency: string
  examReports: ExamReport[]
  onExamReport: (report: ExamReport) => void
}) {
  const [selected, setSelected] = useState('radiation')
  const [examOpen, setExamOpen] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [verdict, setVerdict] = useState(
    "Maintain countermeasures and repeat biometrics in 30 minutes.",
  )
  const baseSystem = systems.find((item) => item.id === selected) ?? systems[0]
  const liveStatus = systemStatus(selected, member, phase, scenario)
  const s = { ...baseSystem, status: liveStatus, color: systemColor(liveStatus) }
  const activeHazards = hazardsBySystem[selected] ?? []
  const readings: Record<string, { current: string; baseline: string; source: string }> = {
    neuro: {
      current: scenario === 'nominal' ? "20/20 · Fatigue 18%" : "20/25 · Fatigue 42%",
      baseline: "20/20 · Fatigue 18%",
      source: "Fundus camera + cognitive test",
    },
    respiratory: {
      current: `SpO₂ ${member.current.spo2}% · RR 18 breaths/min`,
      baseline: `SpO₂ ${member.baseline.spo2}% · RR 14 breaths/min`,
      source: "Ring + cabin sensor",
    },
    cardio: {
      current: `${member.current.hr} bpm · ${member.current.systolic}/${member.current.diastolic} mmHg`,
      baseline: `${member.baseline.hr} bpm · ${member.baseline.systolic}/${member.baseline.diastolic} mmHg`,
      source: 'Wearable + ECG',
    },
    digestive: {
      current: `${member.current.glucose} mg/dL · Hydration 1.9 L`,
      baseline: `${member.baseline.glucose} mg/dL · 2.5 L/day`,
      source: "Glucose meter + nutrition log",
    },
    muscular: {
      current: "BMD −0.7% · ARED 72%",
      baseline: "BMD 100% · ARED 100%",
      source: "Ultrasound + exercise",
    },
    radiation: {
      current: `${member.current.radiation} mSv cumulative`,
      baseline: "0 mSv preflight",
      source: "Personal dosimeter + environment",
    },
  }
  const reading = readings[selected]
  const examBySystem: Record<string, string> = {
    neuro: "Fundus scan for SANS",
    respiratory: "Spirometry and CO₂ reading",
    cardio: "Cardiac ultrasound + ECG",
    digestive: "Capillary glucose and metabolic strip",
    muscular: "Muscle ultrasound + urinary calcium",
    radiation: "Complete blood count and dosimetry",
  }
  const demoResultBySystem: Record<string, string> = {
    neuro: "Acuity 20/25 · Ocular pressure 19 mmHg",
    respiratory: "FVC 4.2 L · Exhaled CO₂ 38 mmHg",
    cardio: "Sinus rhythm · LVEF 61% · ECG without acute changes",
    digestive: "Glucose 82 mg/dL · Negative ketones",
    muscular: "Muscle thickness −0.7% · Calcium 186 mg/24 h",
    radiation: "White blood cells 5.8 ×10⁹/L · Cumulative dose confirmed",
  }
  const currentExamReport = examReports.find(
    (report) => report.crewId === member.id && report.systemId === selected,
  )
  const examResult = currentExamReport?.result ?? ''
  const transmissionLabel = currentExamReport
    ? {
        pending: "Awaiting connection",
        sending: "Sending",
        sent: "Sent to Earth",
      }[currentExamReport.transmission]
    : ''
  const recordExam = (result: string, transmission: ExamTransmission) => {
    onExamReport({
      id: `${member.id}-${selected}`,
      crewId: member.id,
      crewName: member.name,
      systemId: selected,
      exam: examBySystem[selected],
      result,
      completedAt: currentExamReport?.completedAt ?? new Date().toISOString(),
      transmission,
      demo: role === 'astronaut',
    })
  }
  const actionBySystem: Record<string, string[]> = {
    neuro: [
      "Stop precision visual work and sit down.",
      "Reduce cabin CO₂ and keep the head elevated.",
      "Perform visual acuity and brief cognitive tests.",
    ],
    respiratory: [
      "Stop activity and confirm the sensor reading on another finger.",
      "Check the module's CO₂, airflow, and filters.",
      "Administer oxygen per protocol if SpO₂ < 92%.",
    ],
    cardio: [
      "Stop activity and adopt a semi-reclined position.",
      "Drink 500 ml of electrolyte solution.",
      "Record a 6-lead ECG using the buddy system.",
    ],
    digestive: [
      "Drink 500 ml of electrolyte solution.",
      "Stop EVA activity and measure capillary glucose.",
      "Repeat the measurement after 15 minutes.",
    ],
    muscular: [
      "Stop impact loading or EVA.",
      "Complete a pain and mobility assessment.",
      "Reschedule supervised ARED exercise and hydrate.",
    ],
    radiation: [
      "Confirm the event using the space weather monitor.",
      "Move to the shielded shelter and close the hatches.",
      "Fit a backup dosimeter and obtain a complete blood count.",
    ],
  }
  const needsTriage = liveStatus !== 'optimal'
  return (
    <div className="atlas-twin-page">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to the biometric dashboard
      </button>
      <div className="profile-header atlas-profile-header">
        <Avatar member={member} large />
        <div>
          <div className="eyebrow">
            <span /> ATLAS BODY TWIN · MULTICAUSAL DIAGNOSTICS
          </div>
          <h2>{member.name}</h2>
          <p>{member.role} · Physiological model synced 08 s ago</p>
        </div>
        <StatusPill status={member.status} />
        <div className="baseline-badge">
          <BadgeCheck size={18} />
          <div>
            <span>NASA HRP KNOWLEDGE GRAPH</span>
            <b>5 hazards · 6 systems · N:N relationship</b>
          </div>
        </div>
      </div>
      <div className="atlas-twin-layout">
        <section className="atlas-anatomy-panel">
          <div className="panel-heading">
            <div>
              <span>HOLOGRAPHIC VIEWER</span>
              <h3>Anatomy & diagnostics</h3>
            </div>
            <Activity />
          </div>
          <AnatomicalFigure
            selected={selected}
            onSelect={setSelected}
            member={member}
            phase={phase}
            scenario={scenario}
          />
          <div className="atlas-system-tabs">
            {systems.map((item) => {
              const status = systemStatus(item.id, member, phase, scenario)
              return (
                <button
                  key={item.id}
                  className={selected === item.id ? 'active' : ''}
                  onClick={() => setSelected(item.id)}
                >
                  <i style={{ background: systemColor(status) }} />
                  <span>{item.name}</span>
                  <StatusPill status={status} />
                </button>
              )
            })}
          </div>
        </section>
        <div className="atlas-diagnostic-panel">
          <section className="diagnostic-summary">
            <div className="diagnostic-title">
              <div className="system-icon" style={{ color: s.color, background: `${s.color}18` }}>
                {selected === 'neuro' ? (
                  <Brain />
                ) : selected === 'respiratory' ? (
                  <Wind />
                ) : selected === 'cardio' ? (
                  <HeartPulse />
                ) : selected === 'digestive' ? (
                  <FlaskConical />
                ) : selected === 'muscular' ? (
                  <Bone />
                ) : (
                  <Dna />
                )}
              </div>
              <div>
                <span>SELECTED SYSTEM</span>
                <h3>{s.name}</h3>
                <p>{s.metric}</p>
              </div>
              <StatusPill status={liveStatus} />
            </div>
            <div className="causal-notice">
              <Sparkles />
              <p>
                <b>HRP multicausal relationship:</b> one hazard can affect several systems, and this risk can have multiple simultaneous causes.
              </p>
            </div>
            <div className="hazard-matrix">
              <div className="hazard-column">
                <span>5 SPACE HAZARDS</span>
                {hazardCatalog.map((hazard) => {
                  const active = activeHazards.includes(hazard.id)
                  return (
                    <div key={hazard.id} className={active ? 'active' : ''}>
                      <i />{' '}
                      <div>
                        <b>{hazard.name}</b>
                        <small>{hazard.detail}</small>
                      </div>
                      {active && <Check size={13} />}
                    </div>
                  )
                })}
              </div>
              <div className="causal-flow">
                <span />
                <b>
                  CAUSALITY
                  <br />N : N
                </b>
                <span />
              </div>
              <div className="risk-node" style={{ '--risk-color': s.color } as React.CSSProperties}>
                <div>
                  {selected === 'radiation' ? (
                    <Dna />
                  ) : selected === 'cardio' ? (
                    <HeartPulse />
                  ) : (
                    <Activity />
                  )}
                </div>
                <span>RESULTING RISK</span>
                <b>{s.name}</b>
                <small>{s.what}</small>
              </div>
            </div>
            {selected === 'radiation' && (
              <div className="radiation-breakdown">
                <div className="section-label">
                  <Radiation />
                  <span>LIVE IONIZING DOSE CONTRIBUTION</span>
                </div>
                {[
                  ["Galactic cosmic rays", 52, "High energy · Omnidirectional"],
                  ["Solar storms", 18, "SPE / CME · 11-year solar cycle"],
                  ["Secondary neutrons", 30, "Impact on hull and tissue · ~30% ISS"],
                ].map(([label, value, detail]) => (
                  <div className="dose-row" key={String(label)}>
                    <div>
                      <b>{label}</b>
                      <span>{detail}</span>
                    </div>
                    <div className="dose-track">
                      <i style={{ width: `${value}%` }} />
                    </div>
                    <strong>{value}%</strong>
                  </div>
                ))}
                <div className="shelter-alert">
                  <ShieldAlert />
                  <span>Radiation shelter available · Access time 02m 40s</span>
                </div>
              </div>
            )}
            <div className="biometric-comparison">
              <div>
                <span>PREFLIGHT BASELINE</span>
                <b>{reading.baseline}</b>
                <small>Verified individual normal range</small>
              </div>
              <div className="comparison-arrow">VS</div>
              <div className={liveStatus}>
                <span>CURRENT BIOMETRIC READING</span>
                <b>{reading.current}</b>
                <small>{reading.source}</small>
              </div>
            </div>
          </section>
          {needsTriage ? (
            <section className={`triage-workflow ${liveStatus}`}>
              <div className="triage-header">
                <div>
                  <span>ATLAS AUTONOMOUS TRIAGE</span>
                  <h3>Active clinical workflow</h3>
                </div>
                <div className={`review-badge ${reviewed ? 'reviewed' : ''}`}>
                  {reviewed ? <Check size={13} /> : <Clock3 size={13} />}
                  {reviewed ? "REVIEWED BY MEDICAL OFFICER" : "AWAITING MEDICAL REVIEW"}
                </div>
              </div>
              <div className="triage-step">
                <span>01</span>
                <div>
                  <small>IMMEDIATE AUTONOMY</small>
                  <h4>Rapid action protocol</h4>
                  <ol>
                    {actionBySystem[selected].map((action, index) => (
                      <li key={action}>
                        <i>{index + 1}</i>
                        {action}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="triage-step">
                <span>02</span>
                <div>
                  <small>DIAGNOSTIC CONFIRMATION</small>
                  <h4>Additional testing required</h4>
                  <p>
                    Wearables alone cannot confirm the multicausal origin. ATLAS requests:
                  </p>
                  <div className="exam-order">
                    <FlaskConical />
                    <div>
                      <b>{examBySystem[selected]}</b>
                      <span>
                        {examResult
                          ? role === 'astronaut'
                            ? `Exam complete · Results saved · ${examResult}`
                            : `Uploaded result: ${examResult}`
                          : "ATLAS order · Clinical priority 2"}
                      </span>
                      {currentExamReport && role === 'astronaut' && (
                        <small className={`exam-sync-status ${currentExamReport.transmission}`}>
                          <Radio /> {transmissionLabel} · Demo mode
                        </small>
                      )}
                    </div>
                    {examResult ? (
                      <span className="exam-done">
                        <Check /> SAVED
                      </span>
                    ) : (
                      <button onClick={() => setExamOpen(true)}>
                        {role === 'astronaut'
                          ? "RUN EXAM WITH DEVICE"
                          : "UPLOAD / RUN EXAM NOW"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="triage-step">
                <span>03</span>
                <div>
                  <small>HUMAN VALIDATION</small>
                  <h4>Escalation to a medical professional</h4>
                  <div className="latency-block">
                    <Radio />
                    <div>
                      <span>EARTH LINK</span>
                      <b>{earthLatency}</b>
                    </div>
                    <small>The local protocol continues without waiting for a response.</small>
                  </div>
                  <div className="doctor-verdict">
                    <div className="doctor-verdict-head">
                      <Signature />
                      <div>
                        <span>MEDICAL PROFESSIONAL'S ASSESSMENT</span>
                        <b>
                          {reviewed
                            ? "Digitally signed · Dr. Marcus Vance, CMO"
                            : "Awaiting review and signature"}
                        </b>
                      </div>
                    </div>
                    {role === 'cmo' ? (
                      <>
                        <textarea
                          value={verdict}
                          onChange={(event) => setVerdict(event.target.value)}
                        />
                        <div className="verdict-actions">
                          <button>ADJUST TREATMENT</button>
                          <button className="primary-btn" onClick={() => setReviewed(true)}>
                            <Signature /> SIGN AND VALIDATE CASE
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>
                        {reviewed
                          ? verdict
                          : "The Crew Medical Officer or Flight Surgeon will review uploaded exams, adjust treatment, and clear the alert."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="no-triage">
              <ShieldCheck />
              <div>
                <span>NO ACTIVE TRIAGE WORKFLOW</span>
                <h3>System within the individual range</h3>
                <p>
                  ATLAS continues preventive multicausal monitoring. No additional exam is required.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
      {examOpen &&
        (role === 'astronaut' ? (
          <MachineExamModal
            exam={examBySystem[selected]}
            result={demoResultBySystem[selected]}
            onClose={() => setExamOpen(false)}
            onStatus={(status) => recordExam(demoResultBySystem[selected], status)}
          />
        ) : (
          <ExamModal
            exam={examBySystem[selected]}
            onClose={() => setExamOpen(false)}
            onSubmit={(value) => {
              recordExam(value, 'pending')
              setExamOpen(false)
            }}
          />
        ))}
    </div>
  )
}

function ManualEntry({
  crew,
  onCritical,
}: {
  crew: CrewMember[]
  onCritical: (a: AlertData) => void
}) {
  const [step, setStep] = useState(1)
  const [selectedCrew, setSelectedCrew] = useState(crew[0].id)
  const [glucose, setGlucose] = useState('92')
  const [weight, setWeight] = useState('68.4')
  const [water, setWater] = useState('2100')
  const [mood, setMood] = useState(4)
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [scanType, setScanType] = useState("Fundus examination · SANS")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(false)
  const member = crew.find((m) => m.id === selectedCrew)!
  const submit = () => {
    const g = Number(glucose)
    if (g < 60)
      onCritical({
        crew: member,
        title: "Critical hypoglycemia",
        detail: `Glucose ${g} mg/dL · Critical threshold < 60 mg/dL`,
        steps: [
          "Confirm the reading with a second test strip.",
          "Administer 15–20 g of fast-acting carbohydrates.",
          "Repeat glucose measurement after 15 minutes.",
          "Maintain the buddy system and suspend operational activity.",
        ],
      })
    else setStep(4)
  }
  const upload = (file?: File) => {
    if (file) setImage(URL.createObjectURL(file))
  }
  const analyze = () => {
    setAnalyzing(true)
    window.setTimeout(() => {
      setAnalyzing(false)
      setResult(true)
    }, 1700)
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> MULTIMODAL CAPTURE
          </div>
          <h2>Manual indicator log</h2>
          <p>Document data not captured by wearables and clinical evidence.</p>
        </div>
        <div className="offline-badge">
          <Database size={16} />
          <div>
            <b>Saved locally</b>
            <span>Will sync with Earth</span>
          </div>
        </div>
      </div>
      <div className="stepper">
        {["Crew member", "Indicators", "Review", "Completed"].map((label, i) => (
          <div key={label} className={step >= i + 1 ? 'active' : ''}>
            <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
            <b>{label}</b>
            <i />
          </div>
        ))}
      </div>
      <div className="capture-layout">
        <section className="form-card">
          {step === 1 && (
            <>
              <div className="form-title">
                <UserRound />
                <div>
                  <span>STEP 01</span>
                  <h3>Identify crew member</h3>
                </div>
              </div>
              <div className="crew-selector">
                {crew.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedCrew(m.id)}
                    className={selectedCrew === m.id ? 'active' : ''}
                  >
                    <Avatar member={m} />
                    <div>
                      <b>{m.name}</b>
                      <span>{m.role}</span>
                    </div>
                    {selectedCrew === m.id && <Check />}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="form-title">
                <Activity />
                <div>
                  <span>STEP 02</span>
                  <h3>Readings and indicators</h3>
                </div>
              </div>
              <div className="input-grid">
                <label>
                  <span>Blood glucose</span>
                  <div>
                    <input
                      type="number"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                    />
                    <b>mg/dL</b>
                  </div>
                  <small>Baseline: {member.baseline.glucose} mg/dL</small>
                </label>
                <label>
                  <span>Body weight</span>
                  <div>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <b>kg</b>
                  </div>
                  <small>Preflight: 69.1 kg</small>
                </label>
                <label>
                  <span>Water intake</span>
                  <div>
                    <input type="number" value={water} onChange={(e) => setWater(e.target.value)} />
                    <b>ml</b>
                  </div>
                  <small>Goal: 2,500 ml</small>
                </label>
              </div>
              <label className="mood-label">
                <span>Stress / mood</span>
                <div className="mood-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      className={mood === n ? 'active' : ''}
                      onClick={() => setMood(n)}
                      key={n}
                    >
                      <span>{n}</span>
                      <b>{["Very low", "Low", 'Neutral', "Good", "Excellent"][n - 1]}</b>
                    </button>
                  ))}
                </div>
              </label>
              <label className="notes">
                <span>Log notes</span>
                <textarea
                  placeholder="Symptoms, changes, or relevant context…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <div className="form-title">
                <ClipboardCheck />
                <div>
                  <span>STEP 03</span>
                  <h3>Review and confirm</h3>
                </div>
              </div>
              <div className="review-person">
                <Avatar member={member} />
                <div>
                  <b>{member.name}</b>
                  <span>{new Date().toLocaleDateString('en-US')} · Manual entry</span>
                </div>
              </div>
              <div className="review-grid">
                <div>
                  <span>GLUCOSE</span>
                  <b>{glucose} mg/dL</b>
                </div>
                <div>
                  <span>WEIGHT</span>
                  <b>{weight} kg</b>
                </div>
                <div>
                  <span>HYDRATION</span>
                  <b>{water} ml</b>
                </div>
                <div>
                  <span>MOOD</span>
                  <b>{mood} / 5</b>
                </div>
              </div>
              <div className="validation">
                <ShieldCheck />
                <div>
                  <b>Automatic validation complete</b>
                  <span>Values will be compared with the individual baseline when saved.</span>
                </div>
              </div>
            </>
          )}
          {step === 4 && (
            <div className="success-state">
              <div>
                <Check />
              </div>
              <span>ENTRY COMPLETE</span>
              <h3>Data saved on the local node</h3>
              <p>Telemetry will be included in the next Earth synchronization package.</p>
              <button onClick={() => setStep(1)}>NEW ENTRY</button>
            </div>
          )}
          {step < 4 && (
            <div className="form-actions">
              <button
                className="secondary-btn"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} /> BACK
              </button>
              <button
                className="primary-btn"
                onClick={() => (step === 3 ? submit() : setStep((s) => s + 1))}
              >
                {step === 3 ? "SAVE ENTRY" : "CONTINUE"} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="imaging-card">
          <div className="panel-heading">
            <div>
              <span>DIAGNOSTIC IMAGING</span>
              <h3>Assisted clinical capture</h3>
            </div>
            <Camera size={20} />
          </div>
          <label className="field-label">EXAM TYPE</label>
          <div className="select-wrap">
            <Microscope size={17} />
            <select
              value={scanType}
              onChange={(e) => {
                setScanType(e.target.value)
                setResult(false)
              }}
            >
              <option>Fundus examination · SANS</option>
              <option>Portable ultrasound</option>
              <option>Test strip</option>
            </select>
            <ChevronDown size={15} />
          </div>
          <div
            className={`image-capture ${image ? 'has-image' : ''}`}
            style={image ? { backgroundImage: `url(${image})` } : {}}
          >
            {!image && (
              <>
                <div className="retina-guide">
                  <div />
                  <span />
                </div>
                <Camera size={30} />
                <b>Align the device with the guide</b>
                <span>Good lighting · Hold steady for 3 s</span>
              </>
            )}
            <label className="upload-btn">
              <Upload size={15} /> UPLOAD OR CAPTURE
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
          </div>
          <button className="analyze-btn" disabled={!image || analyzing} onClick={analyze}>
            <Sparkles size={16} />
            {analyzing ? "ANALYZING ON LOCAL NODE…" : "ANALYZE WITH LOCAL AI"}
          </button>
          {result && (
            <div className="ai-result">
              <div>
                <BadgeCheck size={17} />
                <b>Structured observation</b>
                <span>CONFIDENCE 92%</span>
              </div>
              <ul>
                <li>Optic disc: well-defined margins</li>
                <li>Cup-to-disc ratio: 0.31 · Normal</li>
                <li>No visible signs of optic disc edema</li>
              </ul>
              <small>
                Indicative result. Compare with previous images and the SANS-04 protocol.
              </small>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function AlertCenter({ crew, onSimulate }: { crew: CrewMember[]; onSimulate: () => void }) {
  return (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow red-eye">
            <span /> CLINICAL MONITORING
          </div>
          <h2>Alert center</h2>
          <p>Autonomous prioritization based on baseline, environment, and trends.</p>
        </div>
        <button className="critical-outline" onClick={onSimulate}>
          <Zap size={16} /> SIMULATE CRITICAL ALERT
        </button>
      </div>
      <div className="alert-summary">
        <div>
          <ShieldCheck />
          <b>3</b>
          <span>In optimal range</span>
        </div>
        <div className="amber">
          <AlertTriangle />
          <b>4</b>
          <span>Preventive recommendations</span>
        </div>
        <div className="red">
          <ShieldAlert />
          <b>{crew.filter((c) => c.status === 'critical').length}</b>
          <span>Active critical events</span>
        </div>
      </div>
      <section className="preventive-panel">
        <div className="panel-heading">
          <div>
            <span>AMBER ZONE</span>
            <h3>Preventive recommendations</h3>
          </div>
          <span className="update-time">UPDATED 12 S AGO</span>
        </div>
        {[
          {
            name: 'Emma Jones',
            icon: Bone,
            title: "Bone loss trend",
            detail: "Estimated density −0.7% this month · 14% above expected rate",
            action: "Schedule additional ARED exercise",
          },
          {
            name: 'Emma Jones',
            icon: Moon,
            title: "Circadian desynchronization",
            detail: "Average sleep 6.4 h · Baseline 7.6 h",
            action: "Activate light protocol",
          },
          {
            name: 'Elena Rostova',
            icon: Radiation,
            title: "Cumulative exposure",
            detail: "8.4 mSv · Monthly projection within limit",
            action: "Review sleeping area shielding",
          },
          {
            name: 'Naomi Chen',
            icon: Droplets,
            title: "Hydration below target",
            detail: "1,880 ml of 2,500 ml · 4 h remaining",
            action: "Add 500 ml",
          },
        ].map((a, i) => (
          <div className="preventive-row" key={a.title}>
            <div className="alert-icon">
              <a.icon />
            </div>
            <div className="preventive-copy">
              <span>
                {a.name} · PRIORITY {i < 2 ? "MEDIUM" : "LOW"}
              </span>
              <b>{a.title}</b>
              <p>{a.detail}</p>
            </div>
            <button>
              {a.action}
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

function CriticalModal({ alert, onClose }: { alert: AlertData; onClose: () => void }) {
  const [logged, setLogged] = useState(false)
  return (
    <div className="modal-backdrop">
      <div className="critical-modal">
        <div className="critical-banner">
          <div className="critical-pulse">
            <HeartPulse />
          </div>
          <div>
            <span>MEDICAL ALERT · PRIORITY 1</span>
            <h2>{alert.title}</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {!logged ? (
          <div className="critical-content">
            <div className="patient-bar">
              <Avatar member={alert.crew} />
              <div>
                <b>{alert.crew.name}</b>
                <span>{alert.crew.role}</span>
              </div>
              <div className="critical-value">
                <span>CRITICAL PARAMETER</span>
                <b>{alert.detail}</b>
              </div>
            </div>
            <div className="autonomy-note">
              <Clock3 />
              <div>
                <b>Do not wait for a response from Earth</b>
                <span>Estimated round-trip latency: 28m 40s. Start the local protocol.</span>
              </div>
            </div>
            <h3>Immediate action protocol</h3>
            <div className="protocol-list">
              {alert.steps.map((step, i) => (
                <div key={step}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                  {i === 0 && <b>IMMEDIATE</b>}
                </div>
              ))}
            </div>
            <div className="buddy">
              <Users />
              <div>
                <span>BUDDY SYSTEM REQUIRED</span>
                <b>Request assistance from a second crew member.</b>
              </div>
            </div>
            <button className="notify-btn" onClick={() => setLogged(true)}>
              <Radio /> LOG ACTION AND NOTIFY FLIGHT SURGEON
            </button>
          </div>
        ) : (
          <div className="logged-state">
            <div>
              <Check />
            </div>
            <h3>Action logged</h3>
            <p>
              Clinical package prioritized in the transmission queue. Continuous monitoring enabled.
            </p>
            <button onClick={onClose}>BACK TO ALERT CENTER</button>
          </div>
        )}
      </div>
    </div>
  )
}

type WellnessSummary = { mood: string; stress: string; recommendation: string; turns: number }
type VoiceState = 'idle' | 'speaking' | 'listening' | 'analyzing' | 'paused' | 'complete'
type VoiceRecognitionEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
type VoiceRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: VoiceRecognitionEvent) => void
  onend: () => void
  onerror: () => void
}

function EmotionalHealth({ member }: { member: CrewMember }) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [subtitle, setSubtitle] = useState(
    "ATLAS is ready to start your private well-being session.",
  )
  const [transcript, setTranscript] = useState('')
  const [volume, setVolume] = useState(0.08)
  const [demoMode, setDemoMode] = useState(false)
  const [summary, setSummary] = useState<WellnessSummary | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const loopTimeoutRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const pausedRef = useRef(false)
  const demoRef = useRef(false)
  const turnRef = useRef(0)
  const responsesRef = useRef<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(`atlas-wellness-${member.id}`)
    if (saved) {
      try {
        setSummary(JSON.parse(saved) as WellnessSummary)
      } catch {
        localStorage.removeItem(`atlas-wellness-${member.id}`)
      }
    }
    return () => {
      activeRef.current = false
      window.speechSynthesis?.cancel()
      recognitionRef.current?.abort()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (loopTimeoutRef.current) window.clearTimeout(loopTimeoutRef.current)
      void audioContextRef.current?.close()
    }
  }, [member.id])

  function getRecognitionConstructor() {
    return (
      (
        window as unknown as {
          SpeechRecognition?: new () => VoiceRecognition
          webkitSpeechRecognition?: new () => VoiceRecognition
        }
      ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => VoiceRecognition
        }
      ).webkitSpeechRecognition
    )
  }

  async function initializeAudioMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      context.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = context
      const data = new Uint8Array(analyser.frequencyBinCount)
      const update = () => {
        analyser.getByteFrequencyData(data)
        const average = data.reduce((sum, value) => sum + value, 0) / data.length / 255
        setVolume(Math.max(0.06, Math.min(1, average * 2.8)))
        animationRef.current = requestAnimationFrame(update)
      }
      update()
    } catch {
      setDemoMode(true)
      demoRef.current = true
    }
  }

  function speakAtlas(text: string) {
    if (!activeRef.current) return
    const previousRecognition = recognitionRef.current
    recognitionRef.current = null
    if (previousRecognition) {
      previousRecognition.onerror = () => undefined
      previousRecognition.onend = () => undefined
      previousRecognition.abort()
    }
    setVoiceState('speaking')
    setSubtitle(text)
    setTranscript('')
    const synthesis = (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
    synthesis?.cancel()
    if (!synthesis) {
      loopTimeoutRef.current = globalThis.setTimeout(startListening, 1800) as unknown as number
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.92
    utterance.pitch = 1.02
    utterance.onend = () => {
      if (activeRef.current && !pausedRef.current) startListening()
    }
    utterance.onerror = () => {
      if (activeRef.current && !pausedRef.current) startListening()
    }
    synthesis.speak(utterance)
  }

  function processResponse(text: string) {
    const clean = text.trim()
    if (!clean || !activeRef.current) return
    responsesRef.current.push(clean)
    turnRef.current += 1
    setTranscript(clean)
    setVoiceState('analyzing')
    const severe = /\b(?:cannot cope|can't cope|panic|hopeless|desperate|very bad)\b|no puedo|ansiedad|pánico|solo|desesper|muy mal/i.test(clean)
    const stressed = severe || /\b(?:stress(?:ed)?|tired|poor sleep|slept poorly|exhausted|fatigue)\b|estrés|estresado|cansado|dormí mal|agotado|fatiga/i.test(clean)
    const turn = turnRef.current
    const response =
      turn === 1
        ? stressed
          ? "Thank you for telling me. With only five and a half hours of sleep, fatigue is understandable. Do you notice it most in your concentration, mood, or body?"
          : "I'm glad to hear that. We have been in isolation for forty-two days. How do you feel about your connection with the crew and your concentration today?"
        : severe
          ? "I'm here with you. I will recommend a protected break and immediate human contact. Before continuing, tell me whether you feel safe right now."
          : stressed
            ? "I understand. Let's reduce cognitive load and bring warm circadian lighting forward by thirty minutes. What specific support would help during the next block?"
            : "Your state seems stable. To maintain it, let's take a short active break. Is there anything else you would like to record before continuing?"
    loopTimeoutRef.current = window.setTimeout(() => speakAtlas(response), 1150)
  }

  function startListening() {
    if (!activeRef.current || pausedRef.current) return
    setVoiceState('listening')
    setTranscript("Listening…")
    if (demoRef.current) {
      const demoResponses = [
        "I feel a little tired and have trouble concentrating after sleeping five and a half hours.",
        "Fatigue affects my concentration most, but talking with the crew helps.",
        "An active break and adjusting the lighting before bed would help.",
      ]
      loopTimeoutRef.current = window.setTimeout(
        () => processResponse(demoResponses[turnRef.current % demoResponses.length]),
        2400,
      )
      return
    }
    const SpeechRecognition = getRecognitionConstructor()
    if (!SpeechRecognition) {
      setDemoMode(true)
      demoRef.current = true
      startListening()
      return
    }
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    let finalText = ''
    recognition.onresult = (event) => {
      let interim = ''
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalText += result[0].transcript
        else interim += result[0].transcript
      }
      setTranscript(finalText || interim || "Listening…")
      if (finalText) {
        recognition.stop()
        processResponse(finalText)
      }
    }
    recognition.onerror = () => {
      if (activeRef.current && !pausedRef.current) {
        setDemoMode(true)
        demoRef.current = true
        startListening()
      }
    }
    recognition.onend = () => {
      if (activeRef.current && !pausedRef.current && !finalText && !demoRef.current) {
        loopTimeoutRef.current = window.setTimeout(startListening, 350)
      }
    }
    try {
      recognition.start()
    } catch {
      loopTimeoutRef.current = window.setTimeout(startListening, 350)
    }
  }

  function startSession() {
    activeRef.current = true
    pausedRef.current = false
    demoRef.current = demoMode
    turnRef.current = 0
    responsesRef.current = []
    setSessionSeconds(0)
    setSummary(null)
    setTranscript('')
    timerRef.current = window.setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000)
    if (!demoMode) void initializeAudioMeter()
    speakAtlas(
      `Hello ${member.name.split(' ')[0]}. We have been in transit for forty-two days, and you slept five and a half hours last night. How are your energy and mood today?`,
    )
  }

  function buildSummary() {
    const combined = responsesRef.current.join(' ')
    const severe = /\b(?:cannot cope|can't cope|panic|hopeless|desperate|very bad)\b|no puedo|ansiedad|pánico|solo|desesper|muy mal/i.test(combined)
    const stressed = severe || /\b(?:stress(?:ed)?|tired|poor sleep|slept poorly|exhausted|fatigue)\b|estrés|estresado|cansado|dormí mal|agotado|fatiga/i.test(combined)
    return {
      mood: severe
        ? "Declining mood · Support needed"
        : stressed
          ? "Stable mood with fatigue"
          : "Positive mood",
      stress: severe ? "High" : stressed ? "Moderate" : "Low",
      recommendation: severe
        ? "Protected break and immediate human contact"
        : stressed
          ? "Warm lighting 30 min earlier + 10 min active break"
          : "Maintain sleep window and social connection",
      turns: turnRef.current,
    }
  }

  function stopSession() {
    activeRef.current = false
    pausedRef.current = false
    window.speechSynthesis?.cancel()
    try {
      recognitionRef.current?.stop()
    } catch {
      recognitionRef.current?.abort()
    }
    recognitionRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (loopTimeoutRef.current) window.clearTimeout(loopTimeoutRef.current)
    void audioContextRef.current?.close()
    audioContextRef.current = null
    setVolume(0.08)
    const nextSummary = buildSummary()
    setSummary(nextSummary)
    localStorage.setItem(`atlas-wellness-${member.id}`, JSON.stringify(nextSummary))
    setVoiceState('complete')
    setSubtitle("Session ended. Your emotional summary was saved privately.")
  }

  function togglePause() {
    if (pausedRef.current) {
      pausedRef.current = false
      setVoiceState('listening')
      startListening()
      return
    }
    pausedRef.current = true
    recognitionRef.current?.abort()
    if (loopTimeoutRef.current) window.clearTimeout(loopTimeoutRef.current)
    setVoiceState('paused')
    setSubtitle("Microphone paused. ATLAS will keep the session open.")
  }

  const active = !['idle', 'complete'].includes(voiceState)
  const statusLabel = {
    idle: "SESSION ON STANDBY",
    speaking: "ATLAS SPEAKING",
    listening: "LISTENING TO ASTRONAUT",
    analyzing: "ANALYZING EMOTIONAL STATE",
    paused: "MICROPHONE PAUSED",
    complete: "SESSION COMPLETE",
  }[voiceState]
  const mm = String(Math.floor(sessionSeconds / 60)).padStart(2, '0')
  const ss = String(sessionSeconds % 60).padStart(2, '0')

  return (
    <div className="voice-session-page">
      <div className="page-heading voice-heading">
        <div>
          <div className="eyebrow">
            <span /> BEHAVIORAL HEALTH · HANDS-FREE MODE
          </div>
          <h2>Live voice session</h2>
          <p>Continuous conversation with ATLAS for emotional well-being and circadian adaptation.</p>
        </div>
        <div className="privacy-banner">
          <Lock />
          <div>
            <b>Encrypted session · Private</b>
            <span>Local processing; anonymous CMO alert only for severe risk.</span>
          </div>
        </div>
      </div>
      <section
        className={`voice-stage ${voiceState}`}
        style={{ '--voice-level': volume } as React.CSSProperties}
      >
        <div className="voice-stage-top">
          <div>
            <span className="pulse-dot" />
            <b>{statusLabel}</b>
          </div>
          <span>
            SESSION {mm}:{ss}
          </span>
        </div>
        <div className="voice-orb-wrap">
          <div className="voice-orb-aura aura-one" />
          <div className="voice-orb-aura aura-two" />
          <svg
            className="voice-orb"
            viewBox="0 0 420 420"
            aria-label={`Visualizer: ${statusLabel}`}
          >
            <defs>
              <radialGradient id="voiceCore">
                <stop offset="0" stopColor="currentColor" stopOpacity=".62" />
                <stop offset=".52" stopColor="currentColor" stopOpacity=".15" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
              <filter id="voiceGlow">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle cx="210" cy="210" r="145" fill="url(#voiceCore)" />
            <circle
              className="orb-ring ring-one"
              cx="210"
              cy="210"
              r="118"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 9"
            />
            <circle
              className="orb-ring ring-two"
              cx="210"
              cy="210"
              r="86"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              className="wave wave-one"
              d="M65 210 C100 150 130 270 165 210 S230 150 265 210 S330 270 355 210"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              filter="url(#voiceGlow)"
            />
            <path
              className="wave wave-two"
              d="M75 210 C110 260 140 165 175 210 S240 260 275 210 S325 170 345 210"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity=".65"
            />
            {Array.from({ length: 24 }, (_, index) => {
              const angle = (index / 24) * Math.PI * 2
              const inner = 151
              const length = 8 + ((index * 7) % 18)
              return (
                <line
                  key={index}
                  className="spectrum-bar"
                  x1={210 + Math.cos(angle) * inner}
                  y1={210 + Math.sin(angle) * inner}
                  x2={210 + Math.cos(angle) * (inner + length)}
                  y2={210 + Math.sin(angle) * (inner + length)}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )
            })}
            <g className="orb-mark">
              <circle cx="210" cy="210" r="34" fill="#07131d" stroke="currentColor" />
              <text x="210" y="217" textAnchor="middle" fill="currentColor">
                A
              </text>
            </g>
          </svg>
        </div>
        <div className="voice-caption">
          <span>
            {voiceState === 'listening'
              ? "LIVE TRANSCRIPT"
              : voiceState === 'speaking'
                ? 'ATLAS'
                : "SESSION STATUS"}
          </span>
          <p>{voiceState === 'listening' ? transcript : subtitle}</p>
          {voiceState === 'listening' && (
            <div className="live-level">
              {Array.from({ length: 18 }, (_, index) => (
                <i key={index} style={{ height: `${6 + ((index * 13) % 22)}px` }} />
              ))}
            </div>
          )}
        </div>
        <div className="voice-controls">
          {!active ? (
            <button className="start-conversation" onClick={startSession}>
              <Mic /> START VOICE CONVERSATION
            </button>
          ) : (
            <>
              <button className="stop-conversation" onClick={stopSession}>
                <X /> END SESSION
              </button>
              <button className="pause-conversation" onClick={togglePause}>
                <Mic />
                {voiceState === 'paused' ? "RESUME MICROPHONE" : "MUTE / PAUSE MICROPHONE"}
              </button>
            </>
          )}
          <button
            className={`demo-mode ${demoMode ? 'active' : ''}`}
            onClick={() => {
              const next = !demoMode
              setDemoMode(next)
              demoRef.current = next
            }}
            disabled={active}
          >
            <Play /> SIMULATED DEMO MODE {demoMode ? "ACTIVE" : ''}
          </button>
        </div>
        <div className="voice-loop">
          <span className={voiceState === 'speaking' ? 'active' : ''}>
            <Volume2 /> ATLAS SPEAKS
          </span>
          <i />
          <span className={voiceState === 'listening' ? 'active' : ''}>
            <Mic /> YOU RESPOND
          </span>
          <i />
          <span className={voiceState === 'analyzing' ? 'active' : ''}>
            <Sparkles /> ATLAS ANALYZES
          </span>
        </div>
      </section>
      <div className="voice-bottom-grid">
        <aside className="session-context">
          <div className="wellness-profile">
            <Avatar member={member} large />
            <div>
              <span>PRIVATE SESSION FOR</span>
              <b>{member.name}</b>
              <small>Day 42 of transit · Encrypted local node</small>
            </div>
          </div>
          <div className="context-signals">
            <div>
              <Moon />
              <span>
                <b>5.5 h</b>
                <small>Sleep last night</small>
              </span>
            </div>
            <div>
              <Users />
              <span>
                <b>42 days</b>
                <small>Isolation</small>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <b>+46 min</b>
                <small>Circadian shift</small>
              </span>
            </div>
          </div>
        </aside>
        {summary ? (
          <section className="session-summary">
            <div className="section-label">
              <Sparkles />
              <span>SESSION EMOTIONAL SUMMARY</span>
            </div>
            <div className="summary-metrics">
              <div>
                <span>MOOD TREND</span>
                <b>{summary.mood}</b>
              </div>
              <div>
                <span>FATIGUE / STRESS</span>
                <b>{summary.stress}</b>
              </div>
              <div>
                <span>VOICE TURNS</span>
                <b>{summary.turns}</b>
              </div>
            </div>
            <div className="circadian-recommendation">
              <Moon />
              <div>
                <span>CIRCADIAN RECOMMENDATION</span>
                <b>{summary.recommendation}</b>
              </div>
            </div>
            <footer>
              <ShieldCheck /> Automatically saved to the private profile
            </footer>
          </section>
        ) : (
          <section className="session-ready">
            <Brain />
            <div>
              <span>SUMMARY PENDING</span>
              <h3>Complete a voice conversation</h3>
              <p>ATLAS will generate the summary when you press “End session”.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Report({
  crew,
  env,
  role,
  activeId,
  examReports,
}: {
  crew: CrewMember[]
  env: (typeof environments)[number]
  role: Role
  activeId: string
  examReports: ExamReport[]
}) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [scope, setScope] = useState(role === 'cmo' ? 'all' : activeId)
  const [transmitted, setTransmitted] = useState(false)
  const reportCrew =
    scope === 'all' && role === 'cmo' ? crew : crew.filter((member) => member.id === scope)
  const reportExamReports = examReports.filter((report) =>
    reportCrew.some((member) => member.id === report.crewId),
  )
  const periodLabel = period === 'weekly' ? "Weekly · Days 121–127" : "Monthly · Days 98–127"
  const download = (kind: 'json' | 'csv') => {
    const content =
      kind === 'json'
        ? JSON.stringify(
            {
              mission: env.short,
              period,
              generated: new Date().toISOString(),
              crew: reportCrew,
              machineExams: reportExamReports,
            },
            null,
            2,
          )
        : `crew_member,heart_rate,blood_pressure,spo2,glucose,temperature,radiation,status
${reportCrew.map((c) => `${c.name},${c.current.hr},${c.current.systolic}/${c.current.diastolic},${c.current.spo2},${c.current.glucose},${c.current.temp},${c.current.radiation},${c.status}`).join('\n')}`
    const url = URL.createObjectURL(
      new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-report.${kind}`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="report-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> EARTH TELEMETRY SYNC
          </div>
          <h2>Earth Mission Control report</h2>
          <p>Clinical summary optimized for low-bandwidth transmission.</p>
        </div>
        <div className="report-actions">
          <button onClick={() => window.print()}>
            <FileText size={16} /> DOWNLOAD EXECUTIVE PDF
          </button>
          <button
            className={`transmit-button ${transmitted ? 'sent' : ''}`}
            onClick={() => {
              setTransmitted(true)
              window.setTimeout(() => setTransmitted(false), 2800)
            }}
          >
            {transmitted ? <Check size={16} /> : <Radio size={16} />}{' '}
            {transmitted ? "TRANSMISSION CONFIRMED" : "TRANSMIT TO EARTH MISSION CONTROL"}
          </button>
        </div>
      </div>
      <div className="report-toolbar">
        <div>
          <span>REPORT PERIOD</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}
          >
            <option value="weekly">Weekly report · Days 121–127</option>
            <option value="monthly">Monthly report · Days 98–127</option>
          </select>
        </div>
        <div>
          <span>CLINICAL SCOPE</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            {role === 'cmo' && <option value="all">Entire crew</option>}
            {crew
              .filter((member) => role === 'cmo' || member.id === activeId)
              .map((member) => (
                <option value={member.id} key={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </div>
        <div className="packet">
          <Radio />
          <div>
            <span>ESTIMATED PACKAGE</span>
            <b>18.2 KB</b>
          </div>
          <small>Optimized · GZIP</small>
        </div>
      </div>
      <article className="earth-report">
        <header>
          <div className="brand">
            <div className="brand-mark">
              <Orbit />
            </div>
            <div>
              <strong>ATLAS</strong>
              <span>AUTONOMOUS HEALTH REPORT</span>
            </div>
          </div>
          <div>
            <span>CLASSIFICATION</span>
            <b>MEDICAL · CREW PRIVATE</b>
            <small>Generated: {new Date().toLocaleString('en-US')}</small>
          </div>
        </header>
        <div className="report-title">
          <div>
            <span>REPORT {periodLabel.toUpperCase()}</span>
            <h1>Mission health status</h1>
            <p>{env.name} · Day 127</p>
          </div>
          <div className="go-badge">
            <ShieldCheck />
            <b>GO</b>
            <span>OPERATIONS</span>
          </div>
        </div>
        <section className="executive">
          <h3>01 · Executive summary</h3>
          <p>
            {reportCrew.length > 1
              ? "The crew remains operational. Three profiles remain within their individual ranges, and one profile needs preventive follow-up."
              : `${reportCrew[0]?.name} remains operational with trend monitoring against the individual preflight baseline.`}{' '}
            No critical incidents without an active protocol have been recorded.
          </p>
          <div className="exec-grid">
            <div>
              <span>MEDICAL AVAILABILITY</span>
              <b>
                {reportCrew.filter((member) => member.status !== 'critical').length ===
                reportCrew.length
                  ? '100%'
                  : '75%'}
              </b>
              <small>{reportCrew.length} profile(s) assessed</small>
            </div>
            <div>
              <span>ROUTINE ADHERENCE</span>
              <b>87%</b>
              <small>+4% vs. previous week</small>
            </div>
            <div>
              <span>INCIDENTS HANDLED</span>
              <b>01</b>
              <small>Resolved locally</small>
            </div>
            <div>
              <span>CHANGE VS. BASELINE</span>
              <b>−1.8%</b>
              <small>Composite index</small>
            </div>
          </div>
        </section>
        <section>
          <h3>02 · Status by crew member</h3>
          <div className="report-table">
            <div className="table-head">
              <span>CREW MEMBER</span>
              <span>STATUS</span>
              <span>HR / SpO₂</span>
              <span>GLUCOSE</span>
              <span>DOSE</span>
              <span>TREND</span>
            </div>
            {reportCrew.map((c) => (
              <div className="table-row" key={c.id}>
                <span>
                  <Avatar member={c} />
                  <b>{c.name}</b>
                </span>
                <StatusPill status={c.status} />
                <span>
                  {c.current.hr} bpm / {c.current.spo2}%
                </span>
                <span>{c.current.glucose} mg/dL</span>
                <span>{c.current.radiation} mSv</span>
                <span className={c.status === 'warning' ? 'amber-text' : 'green-text'}>
                  {c.status === 'warning' ? "Monitor" : "Stable"}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="report-clinical-grid">
          <div>
            <h3>03 · Biometric averages for the period</h3>
            <div className="report-averages">
              <div>
                <span>MEAN HR</span>
                <b>
                  {Math.round(
                    reportCrew.reduce((sum, item) => sum + item.current.hr, 0) / reportCrew.length,
                  )}{' '}
                  bpm
                </b>
              </div>
              <div>
                <span>BLOOD PRESSURE</span>
                <b>
                  {Math.round(
                    reportCrew.reduce((sum, item) => sum + item.current.systolic, 0) /
                      reportCrew.length,
                  )}
                  /
                  {Math.round(
                    reportCrew.reduce((sum, item) => sum + item.current.diastolic, 0) /
                      reportCrew.length,
                  )}
                </b>
              </div>
              <div>
                <span>SpO₂</span>
                <b>
                  {Math.round(
                    reportCrew.reduce((sum, item) => sum + item.current.spo2, 0) /
                      reportCrew.length,
                  )}
                  %
                </b>
              </div>
              <div>
                <span>GLUCOSE</span>
                <b>
                  {Math.round(
                    reportCrew.reduce((sum, item) => sum + item.current.glucose, 0) /
                      reportCrew.length,
                  )}{' '}
                  mg/dL
                </b>
              </div>
              <div>
                <span>TEMPERATURE</span>
                <b>
                  {(
                    reportCrew.reduce((sum, item) => sum + item.current.temp, 0) / reportCrew.length
                  ).toFixed(1)}{' '}
                  °C
                </b>
              </div>
              <div>
                <span>RADIATION</span>
                <b>
                  {reportCrew.reduce((sum, item) => sum + item.current.radiation, 0).toFixed(1)} mSv
                </b>
              </div>
            </div>
          </div>
          <div>
            <h3>04 · Countermeasure adherence</h3>
            <div className="adherence-list">
              {[
                ["ARED exercise", 87, "10.2 h / period"],
                ["Hydration", 92, "2.4 L average"],
                ["Sleep log", 96, "6.8 h average"],
              ].map(([label, value, detail]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <div>
                    <i style={{ width: `${value}%` }} />
                  </div>
                  <b>{value}%</b>
                  <small>{detail}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section>
          <h3>05 · Automatically recorded device exams</h3>
          {reportExamReports.length > 0 ? (
            <div className="machine-report-list">
              {reportExamReports.map((exam) => (
                <div key={exam.id}>
                  <FlaskConical />
                  <div>
                    <span>
                      {exam.crewName} · {new Date(exam.completedAt).toLocaleString('en-US')}
                    </span>
                    <b>{exam.exam}</b>
                    <small>{exam.result}</small>
                  </div>
                  <strong className={exam.transmission}>
                    {
                      {
                        pending: "Awaiting connection",
                        sending: "Sending",
                        sent: "Sent to Earth",
                      }[exam.transmission]
                    }
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-empty-exams">
              <Activity />
              <span>No device exams have been recorded in this period.</span>
            </div>
          )}
        </section>
        <section>
          <h3>06 · Scenario follow-ups</h3>
          <div className="incident-log">
            <div>
              <span>DEMO-PRESSURE</span>
              <b>Blood pressure reading · Awaiting repeat and review</b>
              <StatusPill status="warning" />
              <small>No medical assessment · Illustrative scenario</small>
            </div>
            <div>
              <span>DEMO-REST</span>
              <b>Sleep 6 h · Reaction time 310 ms · Follow-up pending</b>
              <StatusPill status="warning" />
              <small>Fictional reference 280 ms · Not a diagnosis</small>
            </div>
          </div>
        </section>
        <section className="report-chart">
          <h3>07 · Illustrative heart rate history</h3>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={reportCrew[0]?.history ?? []}>
              <CartesianGrid stroke="#263143" strokeDasharray="3 4" />
              <XAxis dataKey="day" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} />
              <YAxis domain={[60, 90]} tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#111a26', border: '1px solid #2b3b50' }} />
              <Line
                type="monotone"
                dataKey="hr"
                stroke="#57d9ff"
                strokeWidth={2.5}
                dot={{ fill: '#57d9ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
        <footer>
          <ShieldCheck /> Validated by ATLAS Decision Support · Awaiting Flight Surgeon review
        </footer>
      </article>
      <div className="export-cards">
        <button onClick={() => window.print()}>
          <FileText />
          <div>
            <b>Executive report</b>
            <span>Print view · PDF/A</span>
          </div>
          <small>~ 286 KB</small>
        </button>
        <button onClick={() => download('json')}>
          <FileJson />
          <div>
            <b>JSON package</b>
            <span>Complete telemetry · GZIP ready</span>
          </div>
          <small>12.8 KB</small>
        </button>
        <button onClick={() => download('csv')}>
          <Database />
          <div>
            <b>CSV data</b>
            <span>Compatible with HRP Analytics</span>
          </div>
          <small>5.4 KB</small>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [role, setRole] = useState<Role>('commander')
  const [envId, setEnvId] = useState('mars-transit')
  const [view, setView] = useState<View>('voice')
  const [demoState, setDemoState] = useState<DemoState>(initialDemoState)
  const [demoLoaded, setDemoLoaded] = useState(false)
  const [greetingRoute, setGreetingRoute] = useState<GreetingCrewId | 'welcome' | null>(null)
  const [recognizedCrewId, setRecognizedCrewId] = useState<GreetingCrewId | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [selectedBodySystem, setSelectedBodySystem] = useState('cardio')
  const transmissionTimers = useRef<number[]>([])
  const env = environments.find((item) => item.id === envId)!
  const activeTask = demoState.tasks.find((task) => task.id === activeTaskId)
  const emmaBase = initialCrew.find((member) => member.id === roleMeta.astronaut.crewId)!
  const emma: CrewMember = {
    ...emmaBase,
    status: 'warning',
    current: { ...emmaBase.current, ...demoState.snapshot.measurements },
    history: (demoState.snapshot.history ?? []).map((point) => ({
      day: point.label,
      hr: point.hr,
      glucose: point.glucose,
      sleep: point.sleep,
    })),
  }
  const crew = [emma]
  const examReports: ExamReport[] = demoState.transmissions.map((item) => {
    const task = demoState.tasks.find((candidate) => candidate.id === item.taskId)
    return {
      id: item.id,
      crewId: emma.id,
      crewName: emma.name,
      systemId: task?.systemId ?? 'cardio',
      exam: item.title,
      result: item.result,
      completedAt: item.createdAt,
      transmission:
        item.stage === 'sending'
          ? 'sending'
          : item.stage === 'received' || item.stage === 'review'
            ? 'sent'
            : 'pending',
      demo: true,
      measurements: task?.measurements,
    }
  })

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('registro-diego') === '1') setGreetingRoute('diego')
    else if (query.get('registro-ariel') === '1') setGreetingRoute('ariel')
    else if (query.get('saludo') === '1') setGreetingRoute('welcome')
    if (query.get('bienestar') === '1') setView('emotional')
    setLoggedIn(localStorage.getItem('atlas-session') === 'true')
    const savedRole = localStorage.getItem('atlas-role') as Role | null
    if (savedRole && savedRole in roleMeta) setRole(savedRole)
    const savedCrew = localStorage.getItem('atlas-recognized-crew')
    if ((savedCrew === 'diego' || savedCrew === 'ariel') && greetingRole[savedCrew] === savedRole) {
      setRecognizedCrewId(savedCrew)
    }
    const storedDemo = localStorage.getItem('atlas-demo-state-v1')
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo) as DemoState
        if (
          Array.isArray(parsed.tasks) &&
          Array.isArray(parsed.alerts) &&
          Array.isArray(parsed.transmissions) &&
          parsed.snapshot?.measurements
        ) {
          setDemoState(localizeSavedDemo(parsed))
        }
      } catch {
        localStorage.removeItem('atlas-demo-state-v1')
      }
    }
    setDemoLoaded(true)
  }, [])

  useEffect(() => {
    if (demoLoaded) localStorage.setItem('atlas-demo-state-v1', JSON.stringify(demoState))
  }, [demoLoaded, demoState])

  useEffect(
    () => () => {
      transmissionTimers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  const applyRole = (newRole: Role) => {
    setRecognizedCrewId(null)
    localStorage.removeItem('atlas-recognized-crew')
    setRole(newRole)
    localStorage.setItem('atlas-role', newRole)
    if (
      (view === 'report' && !permissions[newRole].reports) ||
      (view === 'manual' && newRole === 'astronaut')
    ) {
      setView('voice')
    }
  }
  const login = (newRole: Role, crewId?: GreetingCrewId) => {
    applyRole(newRole)
    if (crewId) {
      setRecognizedCrewId(crewId)
      localStorage.setItem('atlas-recognized-crew', crewId)
    }
    setView(new URLSearchParams(window.location.search).get('bienestar') === '1' ? 'emotional' : 'voice')
    setActiveTaskId(null)
    setGreetingRoute(null)
    if (new URLSearchParams(window.location.search).has('saludo')) window.history.replaceState(null, '', '/')
    setLoggedIn(true)
    localStorage.setItem('atlas-session', 'true')
  }
  const logout = () => {
    setRecognizedCrewId(null)
    localStorage.removeItem('atlas-recognized-crew')
    setLoggedIn(false)
    localStorage.removeItem('atlas-session')
  }
  const navigate = (nextView: View) => {
    const policy = (document as Document & { featurePolicy?: { allowsFeature(name: string): boolean } }).featurePolicy
    if (nextView === 'emotional' && window.self !== window.top && policy?.allowsFeature('camera') === false) {
      const direct = new URL('/', window.location.origin)
      direct.searchParams.set('bienestar', '1')
      window.open(direct.toString(), '_blank', 'noopener')
    }
    setView(nextView)
    setActiveTaskId(null)
  }
  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setDemoState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    }))
  }
  const startTask = (task: CareTask) => {
    if (task.status === 'pending') updateTaskStatus(task.id, 'in-progress')
    setActiveTaskId(task.id)
  }
  const updateTransmission = (id: string, stage: TransmissionStage) => {
    setDemoState((current) => ({
      ...current,
      transmissions: current.transmissions.map((item) =>
        item.id === id ? { ...item, stage } : item,
      ),
    }))
  }
  const scheduleTransmission = (id: string) => {
    const stages: Array<[TransmissionStage, number]> = [
      ['pending', 500],
      ['sending', 1100],
      ['received', 1800],
      ['review', 2600],
    ]
    stages.forEach(([stage, delay]) => {
      transmissionTimers.current.push(window.setTimeout(() => updateTransmission(id, stage), delay))
    })
  }
  const completeTask = (task: CareTask) => {
    const completedAt = new Date().toISOString()
    const transmissionId = `journey-${task.id}`
    setDemoState((current) => {
      const previous = current.snapshot.measurements
      const measurements = { ...previous, ...(task.measurements ?? {}) }
      const existingHistory = current.snapshot.history ?? []
      let history = existingHistory.map((point, index) =>
        index === existingHistory.length - 1 ? { ...point, ...measurements, label: "Today" } : point,
      ) as ChartPoint[]
      if (task.id === 'blood-pressure' && existingHistory.length >= 2) {
        const previousPoint = {
          ...existingHistory[existingHistory.length - 1],
          ...previous,
          label: "Yesterday",
        } as ChartPoint
        const currentPoint = {
          ...existingHistory[existingHistory.length - 1],
          ...measurements,
          label: "Today",
        } as ChartPoint
        history = [...existingHistory.slice(0, -2), previousPoint, currentPoint]
      }
      const updatedAlerts =
        task.id === 'blood-pressure'
          ? current.alerts.map((item) =>
              item.id === 'pressure-review'
                ? {
                    ...item,
                    title: "Blood pressure awaiting review",
                    detail: `${measurements.systolic}/${measurements.diastolic} mmHg · Repeat received · Awaiting review`,
                  }
                : item,
            )
          : current.alerts
      const transmission: DemoTransmission = {
        id: transmissionId,
        taskId: task.id,
        title: task.title,
        result: task.result,
        createdAt: completedAt,
        stage: 'saved',
      }
      const hasTransmission = current.transmissions.some((item) => item.id === transmissionId)
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, status: 'completed' } : item,
        ),
        snapshot: {
          ...current.snapshot,
          receivedAt: completedAt,
          measurements,
          history,
          demo: true,
        },
        alerts: updatedAlerts,
        transmissions: hasTransmission
          ? current.transmissions.map((item) => (item.id === transmissionId ? transmission : item))
          : [...current.transmissions, transmission],
      }
    })
    scheduleTransmission(transmissionId)
  }
  const openBodyResult = (systemId: string) => {
    setSelectedBodySystem(systemId)
    setActiveTaskId(null)
    setView('body')
  }
  const openJourneyTask = (taskId?: string) => {
    setView('voice')
    if (!taskId) {
      setActiveTaskId(null)
      return
    }
    const task = demoState.tasks.find((item) => item.id === taskId)
    if (task) startTask(task)
  }
  const resetDemo = () => {
    transmissionTimers.current.forEach((timer) => window.clearTimeout(timer))
    transmissionTimers.current = []
    localStorage.removeItem('atlas-demo-state-v1')
    setDemoState(JSON.parse(JSON.stringify(initialDemoState)) as DemoState)
    setView('voice')
    setActiveTaskId(null)
    setSelectedBodySystem('cardio')
  }

  if (!demoLoaded) return null
  if (greetingRoute === 'diego' || greetingRoute === 'ariel') return <CrewGreetingSetup id={greetingRoute} />
  if (!loggedIn || greetingRoute === 'welcome') return <Login onLogin={login} envId={envId} setEnvId={setEnvId} />
  return (
    <Shell
      view={view}
      setView={navigate}
      env={env}
      role={role}
      onRoleChange={applyRole}
      onLogout={logout}
      onReport={() => setView('report')}
      alertCount={demoState.alerts.length}
      urgentCount={demoState.alerts.filter((item) => item.status === 'urgent').length}
      onResetDemo={resetDemo}
    >
      {view === 'voice' &&
        (activeTask ? (
          <EvaluationGuide
            task={activeTask}
            transmission={demoState.transmissions.find((item) => item.taskId === activeTask.id)}
            onBack={() => setActiveTaskId(null)}
            onProcessing={() => updateTaskStatus(activeTask.id, 'processing')}
            onComplete={completeTask}
            onViewBody={openBodyResult}
          />
        ) : (
          <VoiceInterface
            key={role}
            userName={recognizedCrewId ? greetingCrew[recognizedCrewId].name : roleMeta[role].name}
            pendingExams={demoState.tasks
              .filter((task) => task.type === 'evaluation' && task.status !== 'completed')
              .map((task) => task.title)}
          />
        ))}
      {view === 'dashboard' && (
        <Dashboard
          crew={crew}
          role={role}
          activeId={emma.id}
          onActiveChange={() => undefined}
          sensorConnection="connected"
          sensorSnapshot={demoState.snapshot}
        />
      )}
      {view === 'body' && (
        <BodyTwinOverview
          member={emma}
          snapshot={demoState.snapshot}
          tasks={demoState.tasks}
          selectedSystem={selectedBodySystem}
          onSelectSystem={setSelectedBodySystem}
          onJourney={openJourneyTask}
        />
      )}
      {view === 'manual' && role !== 'astronaut' && (
        <ManualEntry crew={crew} onCritical={() => undefined} />
      )}
      {view === 'alerts' && (
        <DemoAlertCenter
          alerts={demoState.alerts}
          onOpenSystem={openBodyResult}
          onOpenTask={openJourneyTask}
        />
      )}
      {view === 'emotional' && <EmotionalAssessments />}
      {view === 'report' && permissions[role].reports && (
        <Report crew={crew} env={env} role={role} activeId={emma.id} examReports={examReports} />
      )}
    </Shell>
  )
}
