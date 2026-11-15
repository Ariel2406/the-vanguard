// Translate only application-generated demo text; retain measurements and progress.
const savedDemoText: Record<string, string> = {
  'Repetir medición de presión': 'Repeat blood pressure measurement',
  'Repite la lectura siguiendo el protocolo del tensiómetro.': 'Repeat the reading following the blood pressure monitor protocol.',
  'Verifica en la pantalla del equipo que el perfil Emma Jones esté seleccionado.': 'Check that the Emma Jones profile is selected on the device screen.',
  'Sigue las indicaciones del tensiómetro autorizado hasta que confirme una lectura válida.': 'Follow the approved blood pressure monitor instructions until it confirms a valid reading.',
  'Completar ejercicio programado': 'Complete scheduled exercise',
  'Completa los 10 minutos restantes del objetivo de resistencia.': 'Complete the remaining 10 minutes of your resistance exercise goal.',
  'Revisa en el equipo de resistencia el bloque asignado por el plan médico.': 'Review the exercise block assigned by the medical plan on the resistance device.',
  'Sigue las indicaciones del equipo hasta completar el objetivo de la jornada.': "Follow the device instructions until you complete today's goal.",
  'Ejercicio 30/30 min': 'Exercise 30/30 min',
  'Seguimiento de descanso y reacción': 'Rest and reaction follow-up',
  'Revisa la actividad de seguimiento prevista para hoy.': "Review today's scheduled follow-up activity.",
  'Confirma que la prueba cognitiva de demostración está asociada al perfil Emma Jones.': 'Confirm that the demo cognitive test is linked to the Emma Jones profile.',
  'Sigue las indicaciones visuales del equipo hasta que confirme un resultado válido.': "Follow the device's visual instructions until it confirms a valid result.",
  'Reacción mediana 310 ms · Sueño 6 h': 'Median reaction time 310 ms · Sleep 6 h',
  'Análisis de glucosa': 'Glucose analysis',
  'Resultado recibido del analizador.': 'Result received from the analyzer.',
  'Consulta el resultado validado por el analizador.': 'View the result validated by the analyzer.',
  'Glucosa en ayunas 92 mg/dL': 'Fasting glucose 92 mg/dL',
  'Ayer': 'Yesterday',
  'Hoy': 'Today',
  'J-6': 'D-6',
  'J-5': 'D-5',
  'J-4': 'D-4',
  'J-3': 'D-3',
  'J-2': 'D-2',
  'Presión pendiente de revisión': 'Blood pressure awaiting review',
  '145/92 mmHg · Repetición programada': '145/92 mmHg · Repeat reading scheduled',
  'Sueño 6 h · Reacción mediana 310 ms': 'Sleep 6 h · Median reaction time 310 ms',
}

export function localizeSavedDemo<T>(value: T): T {
  if (typeof value === 'string') {
    return (savedDemoText[value] ?? value.replace('mmHg · Repetición recibida · Pendiente de revisión', 'mmHg · Repeat received · Awaiting review')) as T
  }
  if (Array.isArray(value)) return value.map((item) => localizeSavedDemo(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeSavedDemo(item)])) as T
  }
  return value
}
