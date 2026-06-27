# Glosario — Lenguaje ubicuo del proyecto Sostén

> **Fase AI-DLC:** `00-project`
> Estos términos son la fuente única de verdad. Todo documento, código y UI debe usarlos de forma
> consistente (p. ej. siempre **caso**, nunca "ticket"; siempre **solicitante**, nunca "cliente").

| Término | Definición |
|---|---|
| **Solicitante** | Persona que pide apoyo psicológico a través de la app. Puede ser víctima directa, familiar de un afectado o fallecido, o voluntario/rescatista en riesgo de estrés secundario. También puede solicitar en nombre de otra persona. |
| **Caso** | Unidad de trabajo creada a partir de una solicitud. Tiene un nivel de riesgo, un estado y, eventualmente, un psicólogo asignado y notas clínicas. Es el término único; no usar "ticket", "registro" ni "expediente". |
| **Triage** | Clasificación automática y determinística del nivel de riesgo de un caso a partir de las respuestas del formulario. No es un modelo de ML. |
| **Riesgo alto** (`riesgo_alto`) | Nivel que indica ideación suicida o señales de brote psicótico. Dispara la visualización inmediata de líneas de crisis y marca el caso como urgente. |
| **Riesgo moderado** (`riesgo_moderado`) | Necesita apoyo pronto pero sin señales de riesgo vital inmediato. Asignación prioritaria dentro de su categoría. |
| **Seguimiento** (`seguimiento`) | Apoyo no urgente; puede esperar. Asignación por orden de llegada. |
| **Cerrado** (`cerrado`) | Caso atendido y finalizado, sujeto a la política de retención de la Federación. |
| **Asignación** | Relación entre un caso y el psicólogo voluntario que lo atenderá, con fecha y canal de contacto usado. |
| **Cola de espera** | Conjunto ordenado de casos pendientes de asignación. Riesgo alto siempre primero; el resto por orden de llegada dentro de su categoría. |
| **Coordinador de turno** | Persona que monitorea el panel de casos abiertos y prioriza el riesgo alto sin atender. El esquema de turnos lo define la Federación. |
| **Psicólogo voluntario** | Profesional que atiende casos asignados y registra diagnóstico y notas. |
| **Psicólogo verificador** | Profesional designado por la Federación que da de alta y valida a cada voluntario (sabe quién está colegiado). |
| **Línea de crisis** | Servicio externo de atención inmediata (Federación, VEN-911, PsicoMapa UCAB) mostrado ante riesgo alto. No es una integración técnica, es un destino de derivación. |
| **Línea de respaldo** | Línea de crisis adicional/alternativa, editable sin tocar código por el rol administrador. |
| **Nota clínica** | Registro de diagnóstico y evolución de un caso, escrito por el psicólogo asignado. Dato restringido (cifrado). |
| **Federación** | Federación de Psicólogos de Venezuela: dueña y responsable legal de los datos. |
| **Administrador** | Rol técnico con la "llave" de soporte y la capacidad de editar líneas de respaldo. Definido por el equipo de desarrollo. |
