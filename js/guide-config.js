/* ==========================================================================
   CONFIGURACIÓN DE LA GUÍA: Movimiento uniforme y uniformemente acelerado
   Física · Administración del Medio Ambiente · UTP
   Fórmulas SIEMPRE delimitadas: \\( ... \\) en línea (en JS la barra es doble).
   ========================================================================== */
window.GUIDE = {
  id: 'utp-ambiental-mru-mua',
  title: 'Movimiento uniforme y uniformemente acelerado',
  brand: 'FÍSICA UTP — MRU Y MUA',
  icon: 'fa-leaf',
  program: 'Universidad Tecnológica de Pereira — Facultad de Ciencias Ambientales',
  subject: 'Física — Administración del Medio Ambiente',
  teacher: 'Luis Hernando Blandón Dávila',
  teacherRole: 'Docente de Física — UTP',
  institutions: ['Universidad Tecnológica de Pereira'],
  grades: ['I semestre', 'II semestre', 'III semestre'],
  defaultTheme: 'theme-dark',
  defaultTolRel: 0.02,
  notebookMandate: true,
  printSolutions: false,
  gradeLevels: [{ min: 4.6, name: 'SUPERIOR' }, { min: 4.0, name: 'ALTO' }, { min: 3.0, name: 'BÁSICO' }, { min: 1.0, name: 'BAJO' }],

  questions: [
    {
      id: 1, type: 'match', bloom: 'Recordar',
      topic: 'Vocabulario de la cinemática', badge: 'Emparejamiento',
      question: 'Relaciona cada concepto con su significado:',
      pairs: [
        ['Velocidad media \\(\\bar v\\)', 'desplazamiento dividido entre el intervalo de tiempo'],
        ['Distancia recorrida \\(d\\)', 'longitud total del camino (nunca negativa)'],
        ['Pendiente de la gráfica \\(x\\)–\\(t\\)', 'velocidad'],
        ['Pendiente de la gráfica \\(v\\)–\\(t\\)', 'aceleración'],
        ['Área bajo la gráfica \\(v\\)–\\(t\\)', 'desplazamiento']
      ],
      solution: { steps: [
        { label: 'Definiciones', html: '\\(\\bar v = \\Delta x/\\Delta t\\) y \\(d \\ge |\\Delta x|\\): la distancia suma todo el camino; el desplazamiento solo compara el inicio y el final.' },
        { label: 'Pendientes', html: '\\(v = dx/dt\\) es la pendiente de \\(x\\)–\\(t\\) y \\(a = dv/dt\\) es la pendiente de \\(v\\)–\\(t\\).' },
        { label: 'Áreas', html: '\\(\\Delta x = \\int v\\,dt\\): el área bajo \\(v\\)–\\(t\\) es el desplazamiento. Transcribe esta tabla en tu cuaderno.' }
      ] }
    },
    {
      id: 2, type: 'numeric', quick: true, bloom: 'Aplicar',
      topic: 'Velocidad media en un sendero', badge: 'Cálculo numérico',
      question: 'Un guardabosques sale de \\(x_A = 100\\text{ m}\\), camina hasta \\(x_B = 700\\text{ m}\\) y regresa hasta \\(x_C = 400\\text{ m}\\). Todo el recorrido dura \\(\\Delta t = 15\\text{ min} = 900\\text{ s}\\). ¿Cuál es su velocidad media en m/s?',
      answer: 0.333, unit: 'm/s', check: '(400-100)/900',
      hint: 'La velocidad media usa el desplazamiento \\(\\Delta x = x_C - x_A\\), no la distancia recorrida.',
      feedbackBad: 'Revisa: si obtuviste \\(1.0\\text{ m/s}\\), dividiste la distancia (900 m) y calculaste la rapidez media.',
      solution: {
        datos: '\\(x_A = 100\\text{ m},\\; x_C = 400\\text{ m},\\; \\Delta t = 900\\text{ s}\\). La distancia (\\(600 + 300 = 900\\text{ m}\\)) no se usa.',
        formula: '\\(\\bar v = \\dfrac{\\Delta x}{\\Delta t} = \\dfrac{x_C - x_A}{\\Delta t}\\)',
        despeje: 'Sustitución directa: \\(\\bar v = \\dfrac{400 - 100}{900}\\)',
        calculo: '\\(\\bar v = \\dfrac{300\\text{ m}}{900\\text{ s}} \\approx 0.333\\text{ m/s}\\)',
        conclusion: 'La rapidez media sería \\(900/900 = 1.0\\text{ m/s}\\): tres veces mayor, porque incluye el regreso. Verifícalo con la Simulación 1 y transcríbelo en tu cuaderno.'
      }
    },
    {
      id: 3, type: 'choice', quick: true, bloom: 'Comprender',
      topic: 'Pendiente negativa en x–t', badge: 'Análisis conceptual',
      question: 'La gráfica posición–tiempo de un objeto es una línea recta con pendiente negativa. ¿Qué describe esa gráfica?',
      options: [
        'El objeto se mueve con velocidad constante en el sentido negativo del eje \\(x\\).',
        'El objeto está frenando: su rapidez disminuye cada segundo.',
        'El objeto baja por una pendiente o una colina.',
        'El objeto tiene aceleración negativa constante.'
      ],
      correct: 0,
      feedback: {
        1: 'Una recta tiene pendiente constante, así que la velocidad es constante: no frena. Frenar se vería como una curva que se aplana.',
        2: 'La gráfica \\(x\\)–\\(t\\) no es un dibujo del camino: su eje vertical es la posición, no la altura.',
        3: 'Si la pendiente de \\(x\\)–\\(t\\) es constante, \\(a = 0\\). La aceleración negativa produciría una parábola.'
      },
      solution: {
        datos: 'Gráfica \\(x\\)–\\(t\\) recta con pendiente \\(m \\lt 0\\).',
        formula: '\\(v = \\dfrac{\\Delta x}{\\Delta t} = m\\)',
        despeje: 'Pendiente constante \\(\\Rightarrow\\) \\(v\\) constante \\(\\Rightarrow\\) \\(a = 0\\) (MRU).',
        calculo: '\\(v = m \\lt 0\\)',
        conclusion: 'Es un MRU en el sentido negativo del eje. Compruébalo en la Simulación 2 con «eje x apuntando río arriba».'
      }
    },
    {
      id: 4, type: 'numeric', quick: true, bloom: 'Aplicar',
      topic: 'Caudal con el método del flotador', badge: 'Cálculo ambiental',
      question: 'En una quebrada de Pereira, un flotador recorre un tramo recto de \\(L = 15\\text{ m}\\) en \\(\\Delta t = 12.5\\text{ s}\\). La sección transversal mide \\(A = 2.4\\text{ m}^2\\) y la velocidad media del agua es \\(\\bar v = 0.85\\,v_{sup}\\). ¿Cuál es el caudal \\(Q = \\bar v A\\) en m³/s?',
      answer: 2.448, unit: 'm³/s', check: '0.85*(15/12.5)*2.4',
      hint: 'Primero calcula la velocidad superficial con el MRU: \\(v_{sup} = L/\\Delta t\\).',
      feedbackBad: 'Si obtuviste \\(2.88\\text{ m}^3/\\text{s}\\), olvidaste el factor 0.85: el agua del fondo es más lenta que la superficie.',
      solution: {
        datos: '\\(L = 15\\text{ m},\\; \\Delta t = 12.5\\text{ s},\\; A = 2.4\\text{ m}^2,\\; k = 0.85\\)',
        formula: '\\(v_{sup} = \\dfrac{L}{\\Delta t}, \\quad Q = k\\,v_{sup}\\,A\\)',
        despeje: '\\(v_{sup} = \\dfrac{15}{12.5} = 1.2\\text{ m/s}\\)',
        calculo: '\\(Q = (0.85)(1.2\\text{ m/s})(2.4\\text{ m}^2) \\approx 2.45\\text{ m}^3/\\text{s}\\)',
        conclusion: 'Pasan unos 2450 litros por segundo. Repetir la medición en época seca permite detectar disminuciones del caudal. Transcribe el procedimiento.'
      }
    },
    {
      id: 5, type: 'numeric', quick: true, bloom: 'Aplicar',
      topic: 'Arranque de un bus eléctrico', badge: 'Cálculo numérico',
      question: 'Un bus eléctrico parte del reposo desde una estación con aceleración constante \\(a = 1.2\\text{ m/s}^2\\). ¿Qué distancia recorre en los primeros \\(8.0\\text{ s}\\)?',
      answer: 38.4, unit: 'm', check: '0.5*1.2*8**2',
      hint: 'Con \\(v_0 = 0\\) y \\(x_0 = 0\\): \\(x = \\tfrac12 a t^2\\).',
      feedbackBad: 'Si obtuviste \\(76.8\\text{ m}\\), olvidaste el factor \\(\\tfrac12\\); si obtuviste \\(9.6\\text{ m}\\), calculaste \\(v = at\\) en lugar de \\(x\\).',
      solution: {
        datos: '\\(v_0 = 0,\\; a = 1.2\\text{ m/s}^2,\\; t = 8.0\\text{ s}\\)',
        formula: '\\(x = x_0 + v_0 t + \\tfrac12 a t^2\\)',
        despeje: '\\(x = \\tfrac12 a t^2\\)',
        calculo: '\\(x = 0.5(1.2)(8.0)^2 = 0.6(64) = 38.4\\text{ m}\\)',
        conclusion: 'Al final su velocidad es \\(v = at = 9.6\\text{ m/s}\\) (34.6 km/h). Compruébalo en la Simulación 3 con \\(v_0 = 0\\).'
      }
    },
    {
      id: 6, type: 'truefalse', bloom: 'Comprender',
      topic: 'Gráfica x–t en el MUA', badge: 'Verdadero o falso',
      question: 'En un MUA con aceleración positiva, la gráfica posición–tiempo es una recta cuya pendiente es la aceleración.',
      answer: false,
      feedbackOk: 'Correcto: en el MUA la gráfica \\(x\\)–\\(t\\) es una parábola y la recta de pendiente \\(a\\) es la gráfica \\(v\\)–\\(t\\).',
      feedbackBad: 'Revisa: \\(x = x_0 + v_0 t + \\tfrac12 a t^2\\) es cuadrática en \\(t\\), así que su gráfica es una parábola.',
      solution: {
        datos: 'MUA con \\(a \\gt 0\\).',
        formula: '\\(x(t) = x_0 + v_0 t + \\tfrac12 a t^2\\), \\(\\quad v(t) = v_0 + a t\\)',
        despeje: '\\(x(t)\\) es cuadrática; \\(v(t)\\) es lineal con pendiente \\(a\\).',
        calculo: 'La pendiente de \\(x\\)–\\(t\\) cambia en cada instante: vale \\(v(t)\\).',
        conclusion: 'Falso. La gráfica \\(x\\)–\\(t\\) es una parábola cuya tangente tiene pendiente \\(v\\); la recta de pendiente \\(a\\) es \\(v\\)–\\(t\\).'
      }
    },
    {
      id: 7, type: 'numeric', quick: true, bloom: 'Analizar',
      topic: 'Desplazamiento a partir de v–t', badge: 'Lectura de gráfica',
      question: 'La gráfica \\(v\\)–\\(t\\) de un camión recolector une con rectas los puntos \\((0\\text{ s}, 0)\\), \\((4\\text{ s}, 8\\text{ m/s})\\), \\((12\\text{ s}, 8\\text{ m/s})\\) y \\((16\\text{ s}, 0)\\). ¿Cuál es su desplazamiento entre \\(t = 0\\) y \\(t = 16\\text{ s}\\)? (Es el escenario 1 de la Simulación 4).',
      answer: 96, unit: 'm', check: '0.5*4*8 + 8*8 + 0.5*4*8', tolRel: 0.03,
      hint: 'Divide el área bajo la gráfica en un triángulo, un rectángulo y otro triángulo.',
      feedbackBad: 'Si obtuviste \\(128\\text{ m}\\), calculaste el rectángulo completo \\(8 \\times 16\\): los tramos de arranque y frenado son triángulos.',
      solution: {
        datos: 'Tramos: arranque \\(0\\)–\\(4\\text{ s}\\), crucero \\(4\\)–\\(12\\text{ s}\\) a \\(8\\text{ m/s}\\), frenado \\(12\\)–\\(16\\text{ s}\\).',
        formula: '\\(\\Delta x = \\) área bajo \\(v\\)–\\(t\\) \\(= A_1 + A_2 + A_3\\)',
        despeje: '\\(A_1 = \\tfrac12(4)(8),\\; A_2 = (8)(8),\\; A_3 = \\tfrac12(4)(8)\\)',
        calculo: '\\(\\Delta x = 16 + 64 + 16 = 96\\text{ m}\\)',
        conclusion: 'Las pendientes dan \\(a = +2\\), \\(0\\) y \\(-2\\text{ m/s}^2\\). Verifica en la Simulación 4 que el \\(\\Delta x\\) total es 96.0 m y dibuja las tres gráficas en tu cuaderno.'
      }
    },
    {
      id: 8, type: 'choice', bloom: 'Analizar',
      topic: 'Velocidad que cambia de signo', badge: 'Análisis de gráfica',
      question: 'La velocidad de un objeto es \\(v(t) = -4 + 2t\\) (en m/s, con \\(t\\) en s). Su gráfica \\(v\\)–\\(t\\) corta el eje del tiempo en \\(t = 2\\text{ s}\\). ¿Qué ocurre en ese instante?',
      options: [
        'El objeto se detiene un instante y cambia el sentido de su movimiento; su aceleración sigue siendo \\(2\\text{ m/s}^2\\).',
        'El objeto pasa por el origen \\(x = 0\\).',
        'La aceleración del objeto es cero.',
        'El objeto vuelve exactamente a su posición inicial.'
      ],
      correct: 0,
      feedback: {
        1: 'Confundiste \\(v = 0\\) con \\(x = 0\\): la gráfica muestra velocidad, no posición.',
        2: 'La aceleración es la pendiente de \\(v\\)–\\(t\\), que vale 2 en todo instante, también cuando \\(v = 0\\).',
        3: 'En \\(t = 2\\text{ s}\\) el objeto está en el punto más alejado en sentido negativo. El área negativa (de 0 a 2 s) se compensa recién en \\(t = 4\\text{ s}\\).'
      },
      solution: {
        datos: '\\(v_0 = -4\\text{ m/s},\\; a = 2\\text{ m/s}^2\\)',
        formula: '\\(v = v_0 + a t = 0\\)',
        despeje: '\\(t = -\\dfrac{v_0}{a} = \\dfrac{4}{2}\\)',
        calculo: '\\(t = 2\\text{ s}\\), con \\(a = 2\\text{ m/s}^2 \\neq 0\\)',
        conclusion: 'Antes de 2 s el objeto se mueve en sentido negativo y frena; después se mueve en sentido positivo y acelera. Es como una piedra lanzada hacia arriba en su punto más alto.'
      }
    },
    {
      id: 9, type: 'choice', bloom: 'Evaluar',
      topic: 'Límite de velocidad en un corredor de fauna', badge: 'Argumentación científica',
      question: 'Una autoridad ambiental propone bajar el límite de velocidad de \\(60\\) a \\(30\\text{ km/h}\\) en un tramo donde cruza fauna silvestre. Con \\(t_r = 1.5\\text{ s}\\) y \\(a = 7.0\\text{ m/s}^2\\), ¿cuál es la mejor evaluación de la propuesta?',
      options: [
        'Es sólida: la distancia de detención baja de unos \\(44.8\\text{ m}\\) a unos \\(17.5\\text{ m}\\), porque \\(d_r\\) se reduce a la mitad y \\(d_f\\) a la cuarta parte.',
        'Reduce la distancia de detención exactamente a la mitad, porque la distancia es proporcional a la velocidad.',
        'No sirve: la distancia de detención depende solo del tiempo de reacción del conductor.',
        'Solo cambia la distancia de reacción; la de frenado no depende de la velocidad.'
      ],
      correct: 0,
      feedback: {
        1: 'Solo \\(d_r = v_0 t_r\\) es proporcional a \\(v_0\\); \\(d_f = v_0^2/(2a)\\) depende del cuadrado, por eso la reducción total es mayor que la mitad.',
        2: 'La rapidez aparece en los dos términos: \\(d_{det} = v_0 t_r + v_0^2/(2a)\\).',
        3: 'Es al revés: \\(d_r\\) cambia en proporción a \\(v_0\\) y \\(d_f\\) en proporción a \\(v_0^2\\).'
      },
      solution: {
        datos: '\\(v_1 = 60\\text{ km/h} = 16.67\\text{ m/s},\\; v_2 = 30\\text{ km/h} = 8.33\\text{ m/s},\\; t_r = 1.5\\text{ s},\\; a = 7.0\\text{ m/s}^2\\)',
        formula: '\\(d_{det} = v_0 t_r + \\dfrac{v_0^2}{2a}\\)',
        despeje: '\\(d_1 = (16.67)(1.5) + \\dfrac{16.67^2}{14}\\), \\(\\; d_2 = (8.33)(1.5) + \\dfrac{8.33^2}{14}\\)',
        calculo: '\\(d_1 = 25.0 + 19.8 = 44.8\\text{ m}\\); \\(d_2 = 12.5 + 5.0 = 17.5\\text{ m}\\) (61 % menos).',
        conclusion: 'La propuesta está bien justificada: con la Simulación 5 comprueba que a 30 km/h el conductor se detiene incluso si el animal aparece a 20 m.'
      }
    },
    {
      id: 10, type: 'open', bloom: 'Crear',
      topic: 'Diseño de una práctica de campo', badge: 'Indagación (cuaderno)',
      question: 'Diseña una práctica de campo para estimar el caudal del río Consota (cerca del campus de la UTP) con el método del flotador. Incluye: materiales, cómo elegirías el tramo, cuántas repeticiones harías, una tabla de datos \\(x\\)–\\(t\\) con al menos 4 posiciones, cómo comprobarías con una gráfica que el flotador se mueve en MRU y cómo calcularías \\(Q\\).',
      rubric: 'Elige un tramo recto y homogéneo; mide L, Δt (con al menos 3 repeticiones y promedio) y el área de la sección; construye la gráfica x–t y verifica que es una recta (su pendiente es v); aplica Q = 0.85·v·A con unidades; menciona fuentes de error (viento, remolinos, reacción al cronometrar) y medidas de seguridad en el río.'
    }
  ]
};
