# Guion de capturas para el manual (para el Claude de la extensión de Chrome)

> **Para qué:** generar las **18 capturas** del [manual de usuario](./manual-de-usuario.md) sin
> hacerlas a mano. Levanta el local **con seed** (`npm run dev:up` + `npm run dev:reset`), confirma
> que `http://localhost:3000` abre, y **pega el bloque de abajo** en el Claude de la extensión de
> Chrome. Él navega tu navegador y toma cada captura.
>
> Cuando termine, guarda las imágenes en [`img/`](./img/) con los **nombres exactos** indicados.

---

## Prompt (cópialo tal cual)

```
Eres un asistente que va a tomar capturas de pantalla de una app web local para un manual de usuario.
La app está corriendo en http://localhost:3000 (es una PWA de apoyo psicológico, "PPV / SostenVE").

OBJETIVO: navegar cada pantalla listada abajo, esperar a que cargue el contenido (~2-3 s, la app
pide datos al backend), y tomar una captura de pantalla completa. Nombra/guarda cada imagen con el
nombre indicado (formato PNG). Si puedes, guárdalas en la carpeta del proyecto
docs/04-testing/img/ ; si no, descárgalas con ese nombre y yo las muevo.

CREDENCIALES (datos de prueba locales):
- Administrador:  admin@ppv.test        / Admin123!
- Coordinador:    coordinador@ppv.test  / Coordinador123!
- Psicólogo:      psicologo@ppv.test    / Psicologo123!

CÓMO INICIAR SESIÓN: ve a http://localhost:3000/login , escribe el correo en el campo "Correo", la
contraseña en "Contraseña", y haz clic en "Entrar". Para cambiar de rol, primero cierra sesión
(botón "Cerrar sesión" arriba; en móvil está en el menú ☰) y vuelve a entrar con el siguiente.

CONSEJO DE TAMAÑO: para las pantallas 01–11 (solicitante y psicólogo) usa una ventana angosta tipo
móvil (~400 px de ancho); para 20–35 (coordinador y admin) usa una ventana ancha de escritorio
(~1360 px) para que se vea el menú lateral. Si no puedes redimensionar, toma la captura igual.

═══════════════════════════════════════════════════════════════════════
BLOQUE 1 — Públicas (SIN iniciar sesión). Ventana angosta (móvil).
═══════════════════════════════════════════════════════════════════════
1.  Ir a  http://localhost:3000/            → captura:  01-landing.png
2.  Ir a  http://localhost:3000/intake      → captura:  02-intake-triage.png
3.  Ir a  http://localhost:3000/intake/roja → captura:  03-intake-roja.png
4.  Ir a  http://localhost:3000/intake/verde→ captura:  04-intake-verde.png
5.  Ir a  http://localhost:3000/guias        → captura:  05-guias.png
6.  Ir a  http://localhost:3000/login        → captura:  06-login.png

═══════════════════════════════════════════════════════════════════════
BLOQUE 2 — Psicólogo. Inicia sesión con psicologo@ppv.test / Psicologo123!. Ventana angosta.
(Tiene un caso de prueba ya asignado, así que se verá contenido.)
═══════════════════════════════════════════════════════════════════════
7.  Ir a  http://localhost:3000/psicologo        → captura:  10-psicologo-inicio.png
8.  Ir a  http://localhost:3000/psicologo/casos  → captura:  11-psicologo-casos.png
    (Opcional: abre el caso de la lista → captura:  12-psicologo-caso-detalle.png)
Luego CIERRA SESIÓN.

═══════════════════════════════════════════════════════════════════════
BLOQUE 3 — Coordinador. Inicia sesión con coordinador@ppv.test / Coordinador123!. Ventana ancha.
═══════════════════════════════════════════════════════════════════════
9.  Ir a  http://localhost:3000/coordinador             → captura:  20-coordinador-cola.png
10. Ir a  http://localhost:3000/coordinador/psicologos  → captura:  21-coordinador-psicologos.png
11. Ir a  http://localhost:3000/coordinador/voluntarios → captura:  22-coordinador-voluntarios.png
12. Ir a  http://localhost:3000/coordinador/reportes    → captura:  23-coordinador-reportes.png
Luego CIERRA SESIÓN.

═══════════════════════════════════════════════════════════════════════
BLOQUE 4 — Administrador. Inicia sesión con admin@ppv.test / Admin123!. Ventana ancha.
═══════════════════════════════════════════════════════════════════════
13. Ir a  http://localhost:3000/admin               → captura:  30-admin-excepciones.png
14. Ir a  http://localhost:3000/admin/padron        → captura:  31-admin-padron.png
15. Ir a  http://localhost:3000/admin/lineas        → captura:  32-admin-lineas.png
16. Ir a  http://localhost:3000/admin/asignacion    → captura:  33-admin-asignacion.png
17. Ir a  http://localhost:3000/admin/coordinadores → captura:  34-admin-coordinadores.png
18. Ir a  http://localhost:3000/admin/auditoria     → captura:  35-admin-auditoria.png

IMPORTANTE:
- Espera a que cada pantalla termine de cargar (los datos aparecen tras un instante; si ves
  "esqueletos" grises de carga, espera a que se llenen) antes de capturar.
- No inventes datos ni hagas cambios (no borres, no cierres casos): solo navega y captura.
- Si una URL redirige al login, es que la sesión de ese rol no está activa: inicia sesión y reintenta.
```

---

## Después de las capturas
1. Coloca las 18 imágenes en [`docs/04-testing/img/`](./img/) con los nombres exactos.
2. Avísame y **regenero el manual de usuario** con las imágenes ya enlazadas.

## Referencia — nombre de archivo → pantalla
| Archivo | Pantalla |
|---|---|
| `01-landing.png` | Inicio (landing) |
| `02-intake-triage.png` | Triage inicial |
| `03-intake-roja.png` | Ruta roja (líneas de crisis) |
| `04-intake-verde.png` | Ruta verde (formulario) |
| `05-guias.png` | Guías de autoayuda |
| `06-login.png` | Inicio de sesión |
| `10-psicologo-inicio.png` | Portal del psicólogo — inicio |
| `11-psicologo-casos.png` | Psicólogo — Mis casos |
| `12-psicologo-caso-detalle.png` | Psicólogo — detalle del caso (opcional) |
| `20-coordinador-cola.png` | Coordinador — cola en vivo |
| `21-coordinador-psicologos.png` | Coordinador — psicólogos en atención |
| `22-coordinador-voluntarios.png` | Coordinador — voluntarios |
| `23-coordinador-reportes.png` | Coordinador — reportes |
| `30-admin-excepciones.png` | Admin — excepciones de registro |
| `31-admin-padron.png` | Admin — padrón |
| `32-admin-lineas.png` | Admin — líneas de crisis |
| `33-admin-asignacion.png` | Admin — asignación |
| `34-admin-coordinadores.png` | Admin — coordinadores |
| `35-admin-auditoria.png` | Admin — auditoría |
