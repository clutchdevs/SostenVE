// AUTO-GENERATED from apps/api/config/app.config.yml by scripts/build-config.mjs.
// Do NOT edit by hand — edit the YAML and run `npm run config:build`.
export const CONFIG_SECTIONS: Record<string, unknown> = {
  "default": {
    "app": {
      "name": "PPV",
      "locale": "es-VE"
    },
    "triage": {
      "orange_tags_threshold_for_escalation": 3,
      "likert_critical_option": 1
    },
    "sla": {
      "high_risk_assignment_minutes": 10,
      "cron_check_interval_minutes": 2
    },
    "crisis_lines": {
      "routing": [
        {
          "name": "LAPSI",
          "start_hour": 8,
          "end_hour": 26,
          "phone": "+584242907338"
        },
        {
          "name": "Colegio de Psicólogos de Miranda",
          "start_hour": 2,
          "end_hour": 8,
          "phone": "04127840112"
        }
      ],
      "backup_lines": [
        {
          "name": "VEN-911",
          "phone": "911"
        }
      ]
    },
    "clinical_records": {
      "tept_diagnosis_block_days": 30,
      "event_date": "2026-06-24"
    },
    "consent": {
      "psychologist": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-01",
        "text": "Consentimiento Informado para Postulantes — Programa de Formación de\nPsicólogos Voluntarios\n\nAl completar y enviar este formulario, usted manifiesta que actúa de manera\nlibre y voluntaria, y que comprende y acepta las siguientes condiciones:\n\nCarácter Aprobatorio: Declaro conocer que la inscripción en este formulario\nno garantiza la admisión automática ni la certificación. El ingreso al\ncuerpo de voluntarios está sujeto a un proceso de selección y al\ncumplimiento de una formación obligatoria de carácter aprobatorio, siendo\nindispensable cumplir con las evaluaciones y requisitos exigidos durante el\nprograma.\n\nUso de Datos: Autorizo expresamente a que la información suministrada en\neste formulario sea utilizada exclusivamente para fines de gestión e\ninformación gremial, así como para proyectos de investigación institucional.\n\nConfidencialidad: Se garantiza el manejo ético y la absoluta\nconfidencialidad de sus datos de identidad y de contacto, los cuales serán\nprotegidos y no se divulgarán a terceros bajo ninguna circunstancia,\ncumpliendo estrictamente con las normativas éticas de la profesión.\n"
      },
      "requester": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-03",
        "text": "🚨 ¿Es una emergencia o crisis inmediata?\nLlama directamente a nuestra Línea de Ayuda Psicológica: 0424 290.7338\n(todos los días, 8:00 am a 2:00 am) o la Línea de Apoyo Psicológico Gratuito\ndel Colegio de Miranda 0412.7840112 fuera de ese horario. Este formulario es\nsolo para atención NO inmediata.\n\nServicio Gratuito y Voluntario: Impulsado por la FPV y Colegios de Psicólogos\npara brindar primeros auxilios psicológicos y restablecer tu equilibrio\nemocional.\n\nTerceros: Si solicitas el apoyo para un familiar, asegúrate de ingresar los\ndatos de la persona que recibirá la atención, no los tuyos.\n\nConfidencialidad Absoluta: Garantizamos que el manejo de toda tu información\nestará estrictamente protegido.\n"
      }
    },
    "pap": {
      "version": "v0.1.0-draft",
      "updated_at": "2026-06-30",
      "guides": [
        {
          "id": "respiracion",
          "title": "Respiración para calmar la angustia",
          "summary": "Un ejercicio breve para bajar la activación cuando el cuerpo se siente acelerado.",
          "steps": [
            "Busca un lugar lo más seguro posible y siéntate o recuéstate.",
            "Inhala por la nariz contando hasta 4.",
            "Retén el aire contando hasta 4.",
            "Exhala lento por la boca contando hasta 6.",
            "Repite durante 2 o 3 minutos; si te mareas, respira normal y descansa."
          ]
        },
        {
          "id": "anclaje",
          "title": "Anclaje 5-4-3-2-1 para volver al presente",
          "summary": "Cuando la mente se llena de imágenes del sismo, este ejercicio te ayuda a regresar al aquí y ahora.",
          "steps": [
            "Nombra 5 cosas que puedas VER a tu alrededor.",
            "Nombra 4 cosas que puedas TOCAR y siente su textura.",
            "Nombra 3 sonidos que puedas OÍR.",
            "Nombra 2 olores que puedas percibir.",
            "Nombra 1 cosa que puedas saborear o una cosa buena de ti."
          ]
        },
        {
          "id": "dormir",
          "title": "Si no logras dormir",
          "summary": "Es normal que el sueño se altere tras un evento traumático. Algunas ideas para acompañarte.",
          "steps": [
            "Mantén un horario regular para acostarte y levantarte, aunque duermas poco.",
            "Evita noticias o videos del sismo en la hora previa a dormir.",
            "Haz el ejercicio de respiración 4-4-6 al acostarte.",
            "Si no duermes en 20 minutos, levántate, haz algo tranquilo y vuelve a intentar.",
            "Reduce café y bebidas energéticas en la tarde y noche."
          ]
        },
        {
          "id": "acompanar-nino",
          "title": "Cómo acompañar a un niño o niña tras el sismo",
          "summary": "Los menores expresan el malestar de otra forma. Tu calma es su mayor sostén.",
          "steps": [
            "Mantén la calma: los niños se regulan con tu tono de voz y tu cuerpo.",
            "Explica lo ocurrido con palabras simples y honestas, sin detalles que asusten.",
            "Permite el juego y el dibujo: son su manera de procesar lo vivido.",
            "Sostén las rutinas posibles (comida, descanso) para devolver seguridad.",
            "Valida sus emociones: 'es normal tener miedo, estoy contigo'."
          ]
        },
        {
          "id": "perdida",
          "title": "Primeros pasos ante una pérdida",
          "summary": "El duelo tras un desastre es una respuesta humana. No hay una forma 'correcta' de sentirlo.",
          "steps": [
            "Permítete sentir: la tristeza, la rabia o el aturdimiento son esperables.",
            "Busca a alguien de confianza con quien hablar o estar en silencio.",
            "Cuida lo básico: hidratación, algo de comida y descanso.",
            "Pospón decisiones grandes mientras la conmoción esté muy intensa.",
            "Si el dolor te supera o aparecen pensamientos de no querer vivir, busca ayuda de inmediato."
          ]
        },
        {
          "id": "pap-basico",
          "title": "Acompañar a otra persona: mirar, escuchar, conectar",
          "summary": "Principios de Primeros Auxilios Psicológicos para apoyar a alguien cercano.",
          "steps": [
            "MIRAR: observa si la persona está segura y qué necesita con urgencia.",
            "ESCUCHAR: acércate con calma, presta atención sin presionar a que hable.",
            "CONECTAR: ayúdala a cubrir necesidades básicas y a contactar a sus seres queridos.",
            "No minimices ('no fue para tanto') ni fuerces consejos; acompaña.",
            "Si hay riesgo para su vida, comunícate con una línea de crisis ya."
          ]
        }
      ]
    },
    "fpv": {
      "verifier": "http",
      "base_url": "https://api.sistema.fpv.org.ve",
      "request_timeout_seconds": 8,
      "circuit_breaker": {
        "failure_threshold": 3,
        "cooldown_seconds": 30
      }
    },
    "email": {
      "provider": "log",
      "from": "PPV <no-reply@ppv.org.ve>",
      "login_url": "http://localhost:3000/login",
      "coordinator_invite_url": "http://localhost:3000/registro-coordinador",
      "password_reset_url": "http://localhost:3000/restablecer-contrasena",
      "smtp": {
        "host": "host.docker.internal",
        "port": 54325,
        "username": ""
      }
    },
    "presence": {
      "provider": "memory",
      "heartbeat_ttl_seconds": 65,
      "heartbeat_interval_seconds": 30
    },
    "rbac": {
      "roles": [
        "requester",
        "psychologist",
        "coordinator",
        "admin"
      ]
    },
    "security": {
      "cors": {
        "development_origins": [
          "http://localhost:3000"
        ],
        "production_origins": [
          "https://REEMPLAZAR-web.vercel.app"
        ]
      },
      "rate_limit": {
        "intake_requests_per_minute": 10,
        "login_attempts_before_lockout": 5,
        "login_lockout_minutes": 15
      },
      "jwt": {
        "access_token_ttl_minutes": 15,
        "refresh_token_ttl_days": 7
      },
      "session": {
        "idle_timeout_minutes": 30,
        "invitation_ttl_days": 7,
        "password_reset_ttl_minutes": 60
      }
    }
  },
  "development": {
    "app": {
      "name": "PPV (dev)",
      "locale": "es-VE"
    },
    "triage": {
      "orange_tags_threshold_for_escalation": 3,
      "likert_critical_option": 1
    },
    "sla": {
      "high_risk_assignment_minutes": 10,
      "cron_check_interval_minutes": 2
    },
    "crisis_lines": {
      "routing": [
        {
          "name": "LAPSI",
          "start_hour": 8,
          "end_hour": 26,
          "phone": "+584242907338"
        },
        {
          "name": "Colegio de Psicólogos de Miranda",
          "start_hour": 2,
          "end_hour": 8,
          "phone": "04127840112"
        }
      ],
      "backup_lines": [
        {
          "name": "VEN-911",
          "phone": "911"
        }
      ]
    },
    "clinical_records": {
      "tept_diagnosis_block_days": 30,
      "event_date": "2026-06-24"
    },
    "consent": {
      "psychologist": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-01",
        "text": "Consentimiento Informado para Postulantes — Programa de Formación de\nPsicólogos Voluntarios\n\nAl completar y enviar este formulario, usted manifiesta que actúa de manera\nlibre y voluntaria, y que comprende y acepta las siguientes condiciones:\n\nCarácter Aprobatorio: Declaro conocer que la inscripción en este formulario\nno garantiza la admisión automática ni la certificación. El ingreso al\ncuerpo de voluntarios está sujeto a un proceso de selección y al\ncumplimiento de una formación obligatoria de carácter aprobatorio, siendo\nindispensable cumplir con las evaluaciones y requisitos exigidos durante el\nprograma.\n\nUso de Datos: Autorizo expresamente a que la información suministrada en\neste formulario sea utilizada exclusivamente para fines de gestión e\ninformación gremial, así como para proyectos de investigación institucional.\n\nConfidencialidad: Se garantiza el manejo ético y la absoluta\nconfidencialidad de sus datos de identidad y de contacto, los cuales serán\nprotegidos y no se divulgarán a terceros bajo ninguna circunstancia,\ncumpliendo estrictamente con las normativas éticas de la profesión.\n"
      },
      "requester": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-03",
        "text": "🚨 ¿Es una emergencia o crisis inmediata?\nLlama directamente a nuestra Línea de Ayuda Psicológica: 0424 290.7338\n(todos los días, 8:00 am a 2:00 am) o la Línea de Apoyo Psicológico Gratuito\ndel Colegio de Miranda 0412.7840112 fuera de ese horario. Este formulario es\nsolo para atención NO inmediata.\n\nServicio Gratuito y Voluntario: Impulsado por la FPV y Colegios de Psicólogos\npara brindar primeros auxilios psicológicos y restablecer tu equilibrio\nemocional.\n\nTerceros: Si solicitas el apoyo para un familiar, asegúrate de ingresar los\ndatos de la persona que recibirá la atención, no los tuyos.\n\nConfidencialidad Absoluta: Garantizamos que el manejo de toda tu información\nestará estrictamente protegido.\n"
      }
    },
    "pap": {
      "version": "v0.1.0-draft",
      "updated_at": "2026-06-30",
      "guides": [
        {
          "id": "respiracion",
          "title": "Respiración para calmar la angustia",
          "summary": "Un ejercicio breve para bajar la activación cuando el cuerpo se siente acelerado.",
          "steps": [
            "Busca un lugar lo más seguro posible y siéntate o recuéstate.",
            "Inhala por la nariz contando hasta 4.",
            "Retén el aire contando hasta 4.",
            "Exhala lento por la boca contando hasta 6.",
            "Repite durante 2 o 3 minutos; si te mareas, respira normal y descansa."
          ]
        },
        {
          "id": "anclaje",
          "title": "Anclaje 5-4-3-2-1 para volver al presente",
          "summary": "Cuando la mente se llena de imágenes del sismo, este ejercicio te ayuda a regresar al aquí y ahora.",
          "steps": [
            "Nombra 5 cosas que puedas VER a tu alrededor.",
            "Nombra 4 cosas que puedas TOCAR y siente su textura.",
            "Nombra 3 sonidos que puedas OÍR.",
            "Nombra 2 olores que puedas percibir.",
            "Nombra 1 cosa que puedas saborear o una cosa buena de ti."
          ]
        },
        {
          "id": "dormir",
          "title": "Si no logras dormir",
          "summary": "Es normal que el sueño se altere tras un evento traumático. Algunas ideas para acompañarte.",
          "steps": [
            "Mantén un horario regular para acostarte y levantarte, aunque duermas poco.",
            "Evita noticias o videos del sismo en la hora previa a dormir.",
            "Haz el ejercicio de respiración 4-4-6 al acostarte.",
            "Si no duermes en 20 minutos, levántate, haz algo tranquilo y vuelve a intentar.",
            "Reduce café y bebidas energéticas en la tarde y noche."
          ]
        },
        {
          "id": "acompanar-nino",
          "title": "Cómo acompañar a un niño o niña tras el sismo",
          "summary": "Los menores expresan el malestar de otra forma. Tu calma es su mayor sostén.",
          "steps": [
            "Mantén la calma: los niños se regulan con tu tono de voz y tu cuerpo.",
            "Explica lo ocurrido con palabras simples y honestas, sin detalles que asusten.",
            "Permite el juego y el dibujo: son su manera de procesar lo vivido.",
            "Sostén las rutinas posibles (comida, descanso) para devolver seguridad.",
            "Valida sus emociones: 'es normal tener miedo, estoy contigo'."
          ]
        },
        {
          "id": "perdida",
          "title": "Primeros pasos ante una pérdida",
          "summary": "El duelo tras un desastre es una respuesta humana. No hay una forma 'correcta' de sentirlo.",
          "steps": [
            "Permítete sentir: la tristeza, la rabia o el aturdimiento son esperables.",
            "Busca a alguien de confianza con quien hablar o estar en silencio.",
            "Cuida lo básico: hidratación, algo de comida y descanso.",
            "Pospón decisiones grandes mientras la conmoción esté muy intensa.",
            "Si el dolor te supera o aparecen pensamientos de no querer vivir, busca ayuda de inmediato."
          ]
        },
        {
          "id": "pap-basico",
          "title": "Acompañar a otra persona: mirar, escuchar, conectar",
          "summary": "Principios de Primeros Auxilios Psicológicos para apoyar a alguien cercano.",
          "steps": [
            "MIRAR: observa si la persona está segura y qué necesita con urgencia.",
            "ESCUCHAR: acércate con calma, presta atención sin presionar a que hable.",
            "CONECTAR: ayúdala a cubrir necesidades básicas y a contactar a sus seres queridos.",
            "No minimices ('no fue para tanto') ni fuerces consejos; acompaña.",
            "Si hay riesgo para su vida, comunícate con una línea de crisis ya."
          ]
        }
      ]
    },
    "fpv": {
      "verifier": "http",
      "base_url": "https://api.sistema.fpv.org.ve",
      "request_timeout_seconds": 8,
      "circuit_breaker": {
        "failure_threshold": 3,
        "cooldown_seconds": 30
      }
    },
    "email": {
      "provider": "log",
      "from": "PPV <no-reply@ppv.org.ve>",
      "login_url": "http://localhost:3000/login",
      "coordinator_invite_url": "http://localhost:3000/registro-coordinador",
      "password_reset_url": "http://localhost:3000/restablecer-contrasena",
      "smtp": {
        "host": "host.docker.internal",
        "port": 54325,
        "username": ""
      }
    },
    "presence": {
      "provider": "memory",
      "heartbeat_ttl_seconds": 65,
      "heartbeat_interval_seconds": 30
    },
    "rbac": {
      "roles": [
        "requester",
        "psychologist",
        "coordinator",
        "admin"
      ]
    },
    "security": {
      "cors": {
        "development_origins": [
          "http://localhost:3000"
        ],
        "production_origins": [
          "https://REEMPLAZAR-web.vercel.app"
        ]
      },
      "rate_limit": {
        "intake_requests_per_minute": 10,
        "login_attempts_before_lockout": 5,
        "login_lockout_minutes": 15
      },
      "jwt": {
        "access_token_ttl_minutes": 15,
        "refresh_token_ttl_days": 7
      },
      "session": {
        "idle_timeout_minutes": 30,
        "invitation_ttl_days": 7,
        "password_reset_ttl_minutes": 60
      }
    }
  },
  "test": {
    "app": {
      "name": "PPV",
      "locale": "es-VE"
    },
    "triage": {
      "orange_tags_threshold_for_escalation": 3,
      "likert_critical_option": 1
    },
    "sla": {
      "high_risk_assignment_minutes": 10,
      "cron_check_interval_minutes": 2
    },
    "crisis_lines": {
      "routing": [
        {
          "name": "LAPSI",
          "start_hour": 8,
          "end_hour": 26,
          "phone": "+584242907338"
        },
        {
          "name": "Colegio de Psicólogos de Miranda",
          "start_hour": 2,
          "end_hour": 8,
          "phone": "04127840112"
        }
      ],
      "backup_lines": [
        {
          "name": "VEN-911",
          "phone": "911"
        }
      ]
    },
    "clinical_records": {
      "tept_diagnosis_block_days": 30,
      "event_date": "2026-06-24"
    },
    "consent": {
      "psychologist": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-01",
        "text": "Consentimiento Informado para Postulantes — Programa de Formación de\nPsicólogos Voluntarios\n\nAl completar y enviar este formulario, usted manifiesta que actúa de manera\nlibre y voluntaria, y que comprende y acepta las siguientes condiciones:\n\nCarácter Aprobatorio: Declaro conocer que la inscripción en este formulario\nno garantiza la admisión automática ni la certificación. El ingreso al\ncuerpo de voluntarios está sujeto a un proceso de selección y al\ncumplimiento de una formación obligatoria de carácter aprobatorio, siendo\nindispensable cumplir con las evaluaciones y requisitos exigidos durante el\nprograma.\n\nUso de Datos: Autorizo expresamente a que la información suministrada en\neste formulario sea utilizada exclusivamente para fines de gestión e\ninformación gremial, así como para proyectos de investigación institucional.\n\nConfidencialidad: Se garantiza el manejo ético y la absoluta\nconfidencialidad de sus datos de identidad y de contacto, los cuales serán\nprotegidos y no se divulgarán a terceros bajo ninguna circunstancia,\ncumpliendo estrictamente con las normativas éticas de la profesión.\n"
      },
      "requester": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-03",
        "text": "🚨 ¿Es una emergencia o crisis inmediata?\nLlama directamente a nuestra Línea de Ayuda Psicológica: 0424 290.7338\n(todos los días, 8:00 am a 2:00 am) o la Línea de Apoyo Psicológico Gratuito\ndel Colegio de Miranda 0412.7840112 fuera de ese horario. Este formulario es\nsolo para atención NO inmediata.\n\nServicio Gratuito y Voluntario: Impulsado por la FPV y Colegios de Psicólogos\npara brindar primeros auxilios psicológicos y restablecer tu equilibrio\nemocional.\n\nTerceros: Si solicitas el apoyo para un familiar, asegúrate de ingresar los\ndatos de la persona que recibirá la atención, no los tuyos.\n\nConfidencialidad Absoluta: Garantizamos que el manejo de toda tu información\nestará estrictamente protegido.\n"
      }
    },
    "pap": {
      "version": "v0.1.0-draft",
      "updated_at": "2026-06-30",
      "guides": [
        {
          "id": "respiracion",
          "title": "Respiración para calmar la angustia",
          "summary": "Un ejercicio breve para bajar la activación cuando el cuerpo se siente acelerado.",
          "steps": [
            "Busca un lugar lo más seguro posible y siéntate o recuéstate.",
            "Inhala por la nariz contando hasta 4.",
            "Retén el aire contando hasta 4.",
            "Exhala lento por la boca contando hasta 6.",
            "Repite durante 2 o 3 minutos; si te mareas, respira normal y descansa."
          ]
        },
        {
          "id": "anclaje",
          "title": "Anclaje 5-4-3-2-1 para volver al presente",
          "summary": "Cuando la mente se llena de imágenes del sismo, este ejercicio te ayuda a regresar al aquí y ahora.",
          "steps": [
            "Nombra 5 cosas que puedas VER a tu alrededor.",
            "Nombra 4 cosas que puedas TOCAR y siente su textura.",
            "Nombra 3 sonidos que puedas OÍR.",
            "Nombra 2 olores que puedas percibir.",
            "Nombra 1 cosa que puedas saborear o una cosa buena de ti."
          ]
        },
        {
          "id": "dormir",
          "title": "Si no logras dormir",
          "summary": "Es normal que el sueño se altere tras un evento traumático. Algunas ideas para acompañarte.",
          "steps": [
            "Mantén un horario regular para acostarte y levantarte, aunque duermas poco.",
            "Evita noticias o videos del sismo en la hora previa a dormir.",
            "Haz el ejercicio de respiración 4-4-6 al acostarte.",
            "Si no duermes en 20 minutos, levántate, haz algo tranquilo y vuelve a intentar.",
            "Reduce café y bebidas energéticas en la tarde y noche."
          ]
        },
        {
          "id": "acompanar-nino",
          "title": "Cómo acompañar a un niño o niña tras el sismo",
          "summary": "Los menores expresan el malestar de otra forma. Tu calma es su mayor sostén.",
          "steps": [
            "Mantén la calma: los niños se regulan con tu tono de voz y tu cuerpo.",
            "Explica lo ocurrido con palabras simples y honestas, sin detalles que asusten.",
            "Permite el juego y el dibujo: son su manera de procesar lo vivido.",
            "Sostén las rutinas posibles (comida, descanso) para devolver seguridad.",
            "Valida sus emociones: 'es normal tener miedo, estoy contigo'."
          ]
        },
        {
          "id": "perdida",
          "title": "Primeros pasos ante una pérdida",
          "summary": "El duelo tras un desastre es una respuesta humana. No hay una forma 'correcta' de sentirlo.",
          "steps": [
            "Permítete sentir: la tristeza, la rabia o el aturdimiento son esperables.",
            "Busca a alguien de confianza con quien hablar o estar en silencio.",
            "Cuida lo básico: hidratación, algo de comida y descanso.",
            "Pospón decisiones grandes mientras la conmoción esté muy intensa.",
            "Si el dolor te supera o aparecen pensamientos de no querer vivir, busca ayuda de inmediato."
          ]
        },
        {
          "id": "pap-basico",
          "title": "Acompañar a otra persona: mirar, escuchar, conectar",
          "summary": "Principios de Primeros Auxilios Psicológicos para apoyar a alguien cercano.",
          "steps": [
            "MIRAR: observa si la persona está segura y qué necesita con urgencia.",
            "ESCUCHAR: acércate con calma, presta atención sin presionar a que hable.",
            "CONECTAR: ayúdala a cubrir necesidades básicas y a contactar a sus seres queridos.",
            "No minimices ('no fue para tanto') ni fuerces consejos; acompaña.",
            "Si hay riesgo para su vida, comunícate con una línea de crisis ya."
          ]
        }
      ]
    },
    "fpv": {
      "verifier": "dummy",
      "base_url": "https://api.sistema.fpv.org.ve",
      "request_timeout_seconds": 8,
      "circuit_breaker": {
        "failure_threshold": 3,
        "cooldown_seconds": 30
      }
    },
    "email": {
      "provider": "log",
      "from": "PPV <no-reply@ppv.org.ve>",
      "login_url": "http://localhost:3000/login",
      "coordinator_invite_url": "http://localhost:3000/registro-coordinador",
      "password_reset_url": "http://localhost:3000/restablecer-contrasena",
      "smtp": {
        "host": "host.docker.internal",
        "port": 54325,
        "username": ""
      }
    },
    "presence": {
      "provider": "memory",
      "heartbeat_ttl_seconds": 65,
      "heartbeat_interval_seconds": 30
    },
    "rbac": {
      "roles": [
        "requester",
        "psychologist",
        "coordinator",
        "admin"
      ]
    },
    "security": {
      "cors": {
        "development_origins": [
          "http://localhost:3000"
        ],
        "production_origins": [
          "https://REEMPLAZAR-web.vercel.app"
        ]
      },
      "rate_limit": {
        "intake_requests_per_minute": 10,
        "login_attempts_before_lockout": 5,
        "login_lockout_minutes": 15
      },
      "jwt": {
        "access_token_ttl_minutes": 15,
        "refresh_token_ttl_days": 7
      },
      "session": {
        "idle_timeout_minutes": 30,
        "invitation_ttl_days": 7,
        "password_reset_ttl_minutes": 60
      }
    }
  },
  "production": {
    "app": {
      "name": "PPV",
      "locale": "es-VE"
    },
    "triage": {
      "orange_tags_threshold_for_escalation": 3,
      "likert_critical_option": 1
    },
    "sla": {
      "high_risk_assignment_minutes": 10,
      "cron_check_interval_minutes": 2
    },
    "crisis_lines": {
      "routing": [
        {
          "name": "LAPSI",
          "start_hour": 8,
          "end_hour": 26,
          "phone": "+584242907338"
        },
        {
          "name": "Colegio de Psicólogos de Miranda",
          "start_hour": 2,
          "end_hour": 8,
          "phone": "04127840112"
        }
      ],
      "backup_lines": [
        {
          "name": "VEN-911",
          "phone": "911"
        }
      ]
    },
    "clinical_records": {
      "tept_diagnosis_block_days": 30,
      "event_date": "2026-06-24"
    },
    "consent": {
      "psychologist": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-01",
        "text": "Consentimiento Informado para Postulantes — Programa de Formación de\nPsicólogos Voluntarios\n\nAl completar y enviar este formulario, usted manifiesta que actúa de manera\nlibre y voluntaria, y que comprende y acepta las siguientes condiciones:\n\nCarácter Aprobatorio: Declaro conocer que la inscripción en este formulario\nno garantiza la admisión automática ni la certificación. El ingreso al\ncuerpo de voluntarios está sujeto a un proceso de selección y al\ncumplimiento de una formación obligatoria de carácter aprobatorio, siendo\nindispensable cumplir con las evaluaciones y requisitos exigidos durante el\nprograma.\n\nUso de Datos: Autorizo expresamente a que la información suministrada en\neste formulario sea utilizada exclusivamente para fines de gestión e\ninformación gremial, así como para proyectos de investigación institucional.\n\nConfidencialidad: Se garantiza el manejo ético y la absoluta\nconfidencialidad de sus datos de identidad y de contacto, los cuales serán\nprotegidos y no se divulgarán a terceros bajo ninguna circunstancia,\ncumpliendo estrictamente con las normativas éticas de la profesión.\n"
      },
      "requester": {
        "version": "v1.0.0-fpv",
        "updated_at": "2026-07-03",
        "text": "🚨 ¿Es una emergencia o crisis inmediata?\nLlama directamente a nuestra Línea de Ayuda Psicológica: 0424 290.7338\n(todos los días, 8:00 am a 2:00 am) o la Línea de Apoyo Psicológico Gratuito\ndel Colegio de Miranda 0412.7840112 fuera de ese horario. Este formulario es\nsolo para atención NO inmediata.\n\nServicio Gratuito y Voluntario: Impulsado por la FPV y Colegios de Psicólogos\npara brindar primeros auxilios psicológicos y restablecer tu equilibrio\nemocional.\n\nTerceros: Si solicitas el apoyo para un familiar, asegúrate de ingresar los\ndatos de la persona que recibirá la atención, no los tuyos.\n\nConfidencialidad Absoluta: Garantizamos que el manejo de toda tu información\nestará estrictamente protegido.\n"
      }
    },
    "pap": {
      "version": "v0.1.0-draft",
      "updated_at": "2026-06-30",
      "guides": [
        {
          "id": "respiracion",
          "title": "Respiración para calmar la angustia",
          "summary": "Un ejercicio breve para bajar la activación cuando el cuerpo se siente acelerado.",
          "steps": [
            "Busca un lugar lo más seguro posible y siéntate o recuéstate.",
            "Inhala por la nariz contando hasta 4.",
            "Retén el aire contando hasta 4.",
            "Exhala lento por la boca contando hasta 6.",
            "Repite durante 2 o 3 minutos; si te mareas, respira normal y descansa."
          ]
        },
        {
          "id": "anclaje",
          "title": "Anclaje 5-4-3-2-1 para volver al presente",
          "summary": "Cuando la mente se llena de imágenes del sismo, este ejercicio te ayuda a regresar al aquí y ahora.",
          "steps": [
            "Nombra 5 cosas que puedas VER a tu alrededor.",
            "Nombra 4 cosas que puedas TOCAR y siente su textura.",
            "Nombra 3 sonidos que puedas OÍR.",
            "Nombra 2 olores que puedas percibir.",
            "Nombra 1 cosa que puedas saborear o una cosa buena de ti."
          ]
        },
        {
          "id": "dormir",
          "title": "Si no logras dormir",
          "summary": "Es normal que el sueño se altere tras un evento traumático. Algunas ideas para acompañarte.",
          "steps": [
            "Mantén un horario regular para acostarte y levantarte, aunque duermas poco.",
            "Evita noticias o videos del sismo en la hora previa a dormir.",
            "Haz el ejercicio de respiración 4-4-6 al acostarte.",
            "Si no duermes en 20 minutos, levántate, haz algo tranquilo y vuelve a intentar.",
            "Reduce café y bebidas energéticas en la tarde y noche."
          ]
        },
        {
          "id": "acompanar-nino",
          "title": "Cómo acompañar a un niño o niña tras el sismo",
          "summary": "Los menores expresan el malestar de otra forma. Tu calma es su mayor sostén.",
          "steps": [
            "Mantén la calma: los niños se regulan con tu tono de voz y tu cuerpo.",
            "Explica lo ocurrido con palabras simples y honestas, sin detalles que asusten.",
            "Permite el juego y el dibujo: son su manera de procesar lo vivido.",
            "Sostén las rutinas posibles (comida, descanso) para devolver seguridad.",
            "Valida sus emociones: 'es normal tener miedo, estoy contigo'."
          ]
        },
        {
          "id": "perdida",
          "title": "Primeros pasos ante una pérdida",
          "summary": "El duelo tras un desastre es una respuesta humana. No hay una forma 'correcta' de sentirlo.",
          "steps": [
            "Permítete sentir: la tristeza, la rabia o el aturdimiento son esperables.",
            "Busca a alguien de confianza con quien hablar o estar en silencio.",
            "Cuida lo básico: hidratación, algo de comida y descanso.",
            "Pospón decisiones grandes mientras la conmoción esté muy intensa.",
            "Si el dolor te supera o aparecen pensamientos de no querer vivir, busca ayuda de inmediato."
          ]
        },
        {
          "id": "pap-basico",
          "title": "Acompañar a otra persona: mirar, escuchar, conectar",
          "summary": "Principios de Primeros Auxilios Psicológicos para apoyar a alguien cercano.",
          "steps": [
            "MIRAR: observa si la persona está segura y qué necesita con urgencia.",
            "ESCUCHAR: acércate con calma, presta atención sin presionar a que hable.",
            "CONECTAR: ayúdala a cubrir necesidades básicas y a contactar a sus seres queridos.",
            "No minimices ('no fue para tanto') ni fuerces consejos; acompaña.",
            "Si hay riesgo para su vida, comunícate con una línea de crisis ya."
          ]
        }
      ]
    },
    "fpv": {
      "verifier": "http",
      "base_url": "https://api.sistema.fpv.org.ve",
      "request_timeout_seconds": 8,
      "circuit_breaker": {
        "failure_threshold": 3,
        "cooldown_seconds": 30
      }
    },
    "email": {
      "provider": "smtp",
      "from": "PPV <no-reply@ppv.org.ve>",
      "login_url": "https://REEMPLAZAR-web.vercel.app/login",
      "coordinator_invite_url": "https://REEMPLAZAR-web.vercel.app/registro-coordinador",
      "password_reset_url": "https://REEMPLAZAR-web.vercel.app/restablecer-contrasena",
      "smtp": {
        "host": "",
        "port": 587,
        "username": ""
      }
    },
    "presence": {
      "provider": "upstash",
      "heartbeat_ttl_seconds": 65,
      "heartbeat_interval_seconds": 30
    },
    "rbac": {
      "roles": [
        "requester",
        "psychologist",
        "coordinator",
        "admin"
      ]
    },
    "security": {
      "cors": {
        "development_origins": [
          "http://localhost:3000"
        ],
        "production_origins": [
          "https://REEMPLAZAR-web.vercel.app"
        ]
      },
      "rate_limit": {
        "intake_requests_per_minute": 10,
        "login_attempts_before_lockout": 5,
        "login_lockout_minutes": 15
      },
      "jwt": {
        "access_token_ttl_minutes": 15,
        "refresh_token_ttl_days": 7
      },
      "session": {
        "idle_timeout_minutes": 30,
        "invitation_ttl_days": 7,
        "password_reset_ttl_minutes": 60
      }
    }
  }
};
