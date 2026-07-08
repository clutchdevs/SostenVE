# Charter — Proyecto PPV

> **Fase AI-DLC:** `00-project`  ·  **Estado:** vigente
> **Dueño del producto:** Federación de Psicólogos de Venezuela
> **Equipo de desarrollo:** proveedor de la plataforma (no operador de datos)

## Visión en una frase
Una plataforma que conecta de forma rápida, priorizada y segura a personas afectadas por el
terremoto de Venezuela de 2026 (víctimas, familiares, voluntarios y rescatistas en riesgo de
estrés postraumático) con psicólogos voluntarios disponibles, asegurando que **ninguna persona en
riesgo de vida dependa de que un voluntario revise la plataforma a tiempo**.

## Contexto
Doblete sísmico del 24-06-2026 (epicentro San Felipe/Yumare, Yaracuy; magnitudes 7.2 y 7.5), con
cientos de fallecidos, miles de heridos, colapso de infraestructura, y caída intermitente de
electricidad y telecomunicaciones en la capital y el occidente del país. El gremio de psicólogos
voluntarios necesita coordinar la conexión entre afectados y profesionales, y registrar
diagnóstico, notas clínicas e información de contacto de cada caso.

## Problema y usuarios
El gremio atiende de forma rudimentaria y desorganizada; no hay forma eficiente de conectar a quien
necesita apoyo con quien puede darlo, ni de priorizar casos de riesgo vital (ideación suicida,
brote psicótico) sobre el seguimiento regular.

| Actor | Rol |
|---|---|
| **Solicitante** | Víctima directa, familiar, o voluntario/rescatista en riesgo de estrés secundario; pide apoyo vía la app. |
| **Psicólogo voluntario** | Atiende casos asignados; registra diagnóstico y notas clínicas. |
| **Psicólogo verificador** | Profesional designado por la Federación que da de alta y valida a cada voluntario. |
| **Coordinador de turno** | Monitorea el panel de casos abiertos y prioriza riesgo alto. |
| **Federación de Psicólogos de Venezuela** | Dueña y responsable de la información; define políticas de retención, consentimiento y organización interna. |

## Alcance (in-scope)
1. Formulario de solicitud dentro de la web app (no formularios externos), con guardado local/reintento para conexión intermitente.
2. Motor de triage automático: clasifica cada solicitud en riesgo alto / moderado / seguimiento.
3. Riesgo alto: despliegue inmediato de líneas de crisis, **antes e independientemente** de cualquier asignación.
4. Riesgo moderado/seguimiento: asignación automática por especialidad y disponibilidad, con cola visible y priorización ante saturación (300+ solicitudes el primer día).
5. Panel de psicólogo: ver solo los casos propios; registrar diagnóstico y notas clínicas.
6. Panel de coordinador: ver todos los casos, prioridad visual para riesgo alto sin atender.
7. Líneas de crisis y de respaldo configurables sin tocar código (lista editable).
8. Base de datos PostgreSQL con cifrado en reposo para campos clínicos, HTTPS, respaldos automáticos, control de acceso por rol.

## Fuera de alcance (no-scope)
- **No reemplaza** líneas de emergencia oficiales (911, línea de la Federación); es un canal adicional de derivación y seguimiento.
- **No decide** el esquema de turnos, ni la política de retención de historias clínicas, ni la verificación de cada voluntario — organización interna de la Federación.
- **No garantiza** tiempo de respuesta de los voluntarios; el sistema comunica honestamente la saturación.
- **No construye**, en esta fase, ningún canal de mensajería propio (WhatsApp Business API, chatbot).

## Taxonomía de niveles de riesgo
| Nivel | Significado | Acción del sistema |
|---|---|---|
| `riesgo_alto` | Ideación suicida o señales de brote psicótico detectadas en el triage | Líneas de crisis mostradas de inmediato; caso marcado urgente en panel de coordinador |
| `riesgo_moderado` | Necesita apoyo pronto, sin señales de riesgo vital inmediato | Asignación automática prioritaria, dentro de su categoría |
| `seguimiento` | Apoyo no urgente, puede esperar | Asignación automática por orden de llegada, cola visible |
| `cerrado` | Caso atendido y finalizado | Archivado, sujeto a política de retención de la Federación |

## Matriz de quién puede actuar sobre cada caso
| Acción | Psicólogo asignado | Coordinador de turno | Federación / Admin |
|---|---|---|---|
| Ver estado y prioridad de un caso | Solo los propios | Todos | Todos |
| Ver contenido clínico de las notas | Sí (propios) | Sí, auditado (decisión FPV, issue #25) | Según política de retención |
| Registrar diagnóstico / notas | Sí (propios) | No | No |
| Reasignar o cerrar caso | Propios | Sí | Sí |
| Editar líneas de crisis/respaldo | No | No | Sí (rol administrador) |
| Dar de alta a un voluntario | No | No | Psicólogo verificador |

## Restricciones
- Conectividad intermitente: el formulario debe tolerar baja señal (guardado local/reintento).
- Sin entidad legal propia del equipo: la Federación es responsable legal y dueña de los datos.
- Datos clínicos = dato de salud sensible: cifrado y control de acceso no son opcionales.
- Presupuesto: la Federación cubre un costo mensual pequeño de hosting/dominio; sin presupuesto para infraestructura compleja ni servicios de pago no esenciales.
- Documentación en español, markdown versionable, concisa.

## Métricas de éxito
- **Tiempo de asignación:** mediana entre registro de solicitud y asignación, por nivel de riesgo.
- **Cobertura de riesgo alto:** % de casos de riesgo alto con seguimiento humano dentro de un umbral a definir por la Federación.
- **Tasa de abandono de cola:** solicitudes de seguimiento sin asignar más de X horas.
- **Disponibilidad del sistema:** uptime, relevante dado el volumen esperado.

## Riesgos de alto nivel
- **Alerta de riesgo alto sin nadie monitoreando** → las líneas de crisis nunca dependen de un humano disponible; el resto es responsabilidad organizativa (turnos) de la Federación.
- **Saturación de voluntarios** (300+ solicitudes/día) → cola honesta con mensaje claro y panel de capacidad.
- **Filtración o pérdida de datos clínicos** → cifrado en reposo/tránsito, control de acceso por rol, respaldos automáticos.
- **Voluntario no verificado registrándose** → alta solo vía psicólogo verificador, no autoregistro abierto.
- **Dependencia de una sola persona técnica** → documentación desde el día uno.

## Decisiones abiertas (Human-in-the-Loop)
Estas decisiones corresponden a la Federación y **no se inventan** en este repositorio:
- `<TODO — Human-in-the-Loop>` Esquema de turnos de coordinación.
- `<TODO — Human-in-the-Loop>` Política de **retención** de historias clínicas.
- ✅ **Acceso del coordinador a notas clínicas** (issue #25): el coordinador accede al contenido
  clínico de forma **auditada** (cada lectura registra `clinical_note_read` en `audit_log`); la PII de
  contacto sigue restringida al psicólogo asignado.
- ✅ **Consentimiento del solicitante (decisión FPV, 2026-07-03):** la FPV entregó el **texto oficial**;
  cargado en config (`consent.requester`, `v1.0.0-fpv`, `GET /consent/requester`) y mostrado como aviso no
  bloqueante en cada interfaz del solicitante (issue #1).
- ✅ **Nombre del proyecto (decisión FPV):** la Federación definió el nombre **PPV — Programa de Psicólogos
  Voluntarios** (antes se usaba "Sostén" como placeholder).
