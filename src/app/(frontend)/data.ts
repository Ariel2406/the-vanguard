export type Status = 'optimal' | 'warning' | 'critical'

export type Vitals = {
  hr: number
  systolic: number
  diastolic: number
  spo2: number
  temp: number
  glucose: number
  radiation: number
}

export type CrewMember = {
  id: string
  name: string
  shortName: string
  role: string
  initials: string
  color: string
  status: Status
  baseline: Vitals
  current: Vitals
  history: { day: string; hr: number; glucose: number; sleep: number }[]
}

export type Environment = {
  id: string
  name: string
  short: string
  gravity: string
  radiation: string
  latency: string
  risk: number
  description: string
}

export const environments: Environment[] = [
  {
    id: 'iss',
    name: "International Space Station",
    short: "ISS · Low Earth orbit",
    gravity: '0.00 G',
    radiation: "32 µSv/day",
    latency: '0.7 s',
    risk: 1.2,
    description: "Microgravity · Partial magnetospheric protection",
  },
  {
    id: 'mars-transit',
    name: "Spacecraft in transit to Mars",
    short: "ARES · Mars transit",
    gravity: '0.00 G',
    radiation: "150 µSv/day",
    latency: '14m 20s',
    risk: 2.8,
    description: "High cosmic radiation · Clinical autonomy",
  },
  {
    id: 'lunar',
    name: "Artemis Lunar Base",
    short: "ARTEMIS · South pole",
    gravity: '0.16 G',
    radiation: "112 µSv/day",
    latency: '2.6 s',
    risk: 2.1,
    description: "1/6 G gravity · Variable solar exposure",
  },
  {
    id: 'mars-rover',
    name: "Mars surface rover",
    short: "ARES · Surface",
    gravity: '0.38 G',
    radiation: "87 µSv/day",
    latency: '20m 00s',
    risk: 2.4,
    description: "3/8 G gravity · Extravehicular operation",
  },
]

const history = (offset: number) =>
  ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', "Yesterday", "Today"].map((day, index) => ({
    day,
    hr: 66 + offset + [0, 2, -1, 1, 3, 2, 4][index],
    glucose: 88 + offset + [1, -2, 3, 1, 4, 2, 5][index],
    sleep: 7.6 - offset * 0.05 + [0.2, -0.1, 0.1, -0.4, 0.1, -0.3, -0.2][index],
  }))

export const initialCrew: CrewMember[] = [
  {
    id: 'elena',
    name: 'Elena Rostova',
    shortName: 'Rostova',
    role: "Mission commander",
    initials: 'ER',
    color: '#79a9ff',
    status: 'optimal',
    baseline: {
      hr: 64,
      systolic: 112,
      diastolic: 72,
      spo2: 99,
      temp: 36.5,
      glucose: 89,
      radiation: 0,
    },
    current: {
      hr: 68,
      systolic: 116,
      diastolic: 74,
      spo2: 98,
      temp: 36.6,
      glucose: 94,
      radiation: 8.4,
    },
    history: history(0),
  },
  {
    id: 'marcus',
    name: 'Dr. Marcus Vance',
    shortName: 'Vance',
    role: "Crew medical officer",
    initials: 'MV',
    color: '#55d6be',
    status: 'optimal',
    baseline: {
      hr: 62,
      systolic: 118,
      diastolic: 76,
      spo2: 99,
      temp: 36.6,
      glucose: 91,
      radiation: 0,
    },
    current: {
      hr: 66,
      systolic: 120,
      diastolic: 78,
      spo2: 98,
      temp: 36.7,
      glucose: 96,
      radiation: 8.1,
    },
    history: history(-1),
  },
  {
    id: 'mateo',
    name: 'Emma Jones',
    shortName: 'Jones',
    role: "Flight engineer",
    initials: 'EJ',
    color: '#f2c66d',
    status: 'warning',
    baseline: {
      hr: 68,
      systolic: 116,
      diastolic: 74,
      spo2: 98,
      temp: 36.5,
      glucose: 87,
      radiation: 0,
    },
    current: {
      hr: 76,
      systolic: 145,
      diastolic: 92,
      spo2: 98,
      temp: 36.7,
      glucose: 92,
      radiation: 18.4,
    },
    history: history(4),
  },
  {
    id: 'naomi',
    name: "Dr. Naomi Chen",
    shortName: 'Chen',
    role: "Mission specialist",
    initials: 'NC',
    color: '#c58cff',
    status: 'optimal',
    baseline: {
      hr: 65,
      systolic: 110,
      diastolic: 70,
      spo2: 99,
      temp: 36.4,
      glucose: 86,
      radiation: 0,
    },
    current: {
      hr: 70,
      systolic: 114,
      diastolic: 73,
      spo2: 98,
      temp: 36.5,
      glucose: 91,
      radiation: 8.7,
    },
    history: history(1),
  },
]

export const systems = [
  {
    id: 'neuro',
    name: "Brain and optic nerve",
    metric: "SANS · Cognition",
    current: "Acuity 20/25 · Fatigue 42%",
    baseline: "20/20 · Fatigue 18%",
    status: 'warning' as Status,
    color: '#f2bd5b',
    what: "Fluid shifts increase pressure around the optic nerve and may reduce visual acuity and cognitive performance.",
    why: "Microgravity, fragmented sleep, environmental CO₂, and workload act simultaneously on the neuro-ocular system.",
    action: "Perform a fundus examination and a brief cognitive test, and check module CO₂.",
  },
  {
    id: 'respiratory',
    name: "Lungs and breathing",
    metric: "SpO₂ · Cabin air",
    current: "SpO₂ 96% · RR 18 breaths/min",
    baseline: "SpO₂ 99% · RR 14 breaths/min",
    status: 'optimal' as Status,
    color: '#42d7a6',
    what: "The lungs exchange oxygen properly, although enclosed-air quality may increase breathing effort.",
    why: "CO₂, particles, humidity, and cabin airflow interact with the pulmonary response.",
    action: "Confirm the reading on another finger and check module CO₂ and HEPA filters.",
  },
  {
    id: 'cardio',
    name: "Heart and vascular system",
    metric: "HR · Blood pressure · Perfusion",
    current: "82 bpm · 126/81 mmHg",
    baseline: "68 bpm · 116/74 mmHg",
    status: 'warning' as Status,
    color: '#f2bd5b',
    what: "Blood volume and cardiovascular response change, increasing the risk of arrhythmia and orthostatic intolerance.",
    why: "Microgravity, radiation, dehydration, and circadian stress may converge on the same cardiovascular risk.",
    action: "Rest, 6-lead ECG, hydration, and cardiac ultrasound if symptoms persist.",
  },
  {
    id: 'digestive',
    name: "Metabolism and nutrition",
    metric: "Glucose · Hydration",
    current: '103 mg/dL · 1.9 L',
    baseline: "87 mg/dL · 2.5 L/day",
    status: 'warning' as Status,
    color: '#f2bd5b',
    what: "Nutrient absorption, glucose, and fluid balance show a slight deviation from baseline.",
    why: "Stress, circadian rhythm, mission diet, and microgravity alter metabolism simultaneously.",
    action: "Drink 500 ml of electrolyte solution and measure capillary glucose.",
  },
  {
    id: 'muscular',
    name: "Bone and muscle",
    metric: "BMD · Strength · Calcium",
    current: "−0.7% BMD · ARED 72%",
    baseline: "0% loss · ARED 100%",
    status: 'warning' as Status,
    color: '#f2bd5b',
    what: "Bones and muscles lose mechanical loading; released calcium increases the risk of kidney stones.",
    why: "Altered gravity reduces bone stimulation, while nutrition and ARED adherence modulate the rate of loss.",
    action: "Complete 90 min of ARED exercise, check urinary calcium, and ensure 2.5 L of hydration.",
  },
  {
    id: 'radiation',
    name: "Radiation and exposure",
    metric: "Cumulative ionizing dose",
    current: "9.2 mSv · Trend +4.1%",
    baseline: "0 mSv preflight",
    status: 'warning' as Status,
    color: '#f2bd5b',
    what: "The dosimeter records daily and cumulative exposure without inferring organ damage.",
    why: "Galactic cosmic rays, solar storms, and secondary neutrons contribute doses with different profiles.",
    action: "Review space weather, use the shielded shelter, and schedule a complete blood count.",
  },
]
