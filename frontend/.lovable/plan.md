# CasePass — Plan del Frontend (mock-first)

Construir el frontend completo de CasePass en este proyecto Lovable (TanStack Start + Tailwind v4 + shadcn), siguiendo el manual de marca v1.0. **Sin backend real**: todo se sirve desde una capa mock tipada en `src/lib/api/` que más adelante reemplazaremos por llamadas reales al REST de CasePass sin tocar UI.

---

## 1. Sistema de diseño (primer paso, base de todo)

Tokens en `src/styles.css` calcados del manual (en `oklch`):

- **Onyx** `#0A0E1A` (primary / ink) — fondos oscuros, headers, texto principal
- **Quantum Indigo** `#5E5CE6` (accent) + soft `#E0DFFB` — CTAs primarios, links, glow
- **Pulse Mint** `#00D9A3` (action) + soft `#CFF7EC` — estados "handoff en curso", éxito procesal
- **Canvas** `#FAFAFB` bg + `#FFFFFF` surface + neutrals 100/300/500/700
- Semánticos: success `#10B981`, warning `#F59E0B`, danger `#EF4444`, info `#3B82F6`
- **Radii**: 4 / 10 / 16 / 999
- **Sombras**: 3 niveles + `--cp-shadow-glow` (indigo) para hover primario
- **Motion**: 120/180/240ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`
- **Tipografía**: Space Grotesk (display, h1/h2), Inter (body), JetBrains Mono (citas `[Doc: x, p.y]`, IDs, radicados)
- Animación `pulse 1.6s` para chip "handoff en curso"
- Modo claro por defecto + modo oscuro nativo (Onyx → bg, Quantum/Pulse conservan saturación)

Componentes shadcn re-themeados: Button (primary indigo con glow / secondary outline / ghost / destructive), Card (radius 16, shadow-2), Input (radius 4), Badge tipo "chip" (radius pill), Table, Dialog, Sheet, Tabs, Toast (sonner).

Componentes propios de marca:
- `<CitationChip doc page />` — mono, mint border, copia al click
- `<StatusBadge variant="indexed|processing|error|handoff-active" />`
- `<EmptyState />`, `<SectionHeader />`, `<PageHeader />`
- `<FileDropzone />` multi-PDF con preview, progreso simulado de indexación
- `<SourceTooltip />` — al hover sobre `[Doc: x, p.y]` muestra el chunk

---

## 2. Arquitectura de rutas (TanStack file-based)

```
src/routes/
  __root.tsx                       # shell + providers + nav top
  index.tsx                        # landing pública: hero + tagline + CTA login
  login.tsx                        # email/password mock (selector de rol p/ demo)
  _authenticated.tsx               # guard mock (lee user de localStorage)
  _authenticated/
    dashboard.tsx                  # listado de matters con filtros y KPIs
    handoffs.new.tsx               # wizard 3 pasos: matter info → upload PDFs → review
    handoffs.$id.tsx               # layout del matter (tabs)
    handoffs.$id.index.tsx         # overview (matter review + deadlines)
    handoffs.$id.chat.tsx          # chat con citas
    handoffs.$id.note.tsx          # handover note + botón descargar PDF
    handoffs.$id.updates.tsx       # post-action updates (form + timeline)
    handoffs.$id.sources.tsx       # source register (docs indexados)
    inbox.tsx                      # solo Receiving: handoffs recibidos
    admin/
      index.tsx                    # solo Admin: panel de firma
      users.tsx                    # solo Admin: gestión de usuarios
```

Cada ruta define su `head()` con title/description específicos. Errores y notFound con boundaries propios.

---

## 3. Capa mock de API (`src/lib/api/`)

Una sola fachada para que el día que conectemos al REST real solo cambiemos la implementación:

```
src/lib/api/
  types.ts          # Handoff, Document, Chunk, Message, MatterReview, HandoverNote, Update, User
  mock-data.ts      # 4-5 matters de ejemplo con PDFs ficticios, chunks, citas
  client.ts         # interfaz: listHandoffs(), getHandoff(id), createHandoff(...), 
                    #            uploadDocs(...), chatWithSources(...), getMatterReview(...),
                    #            generateHandoverNote(...), generateUpdate(...), listUsers(...)
  mock-client.ts    # implementación con setTimeout(300-1500ms) simulando latencia
  index.ts          # exporta el client activo (mock por ahora)
```

Todos los hooks de UI van por **TanStack Query** (`useQuery`/`useMutation`) → cuando cambiemos a REST real, solo cambia `index.ts`.

---

## 4. Auth mock + roles (Solicitor / Receiving / Admin)

- `src/lib/auth.tsx`: contexto con `user`, `role`, `login`, `logout`, persistido en `localStorage`
- Login screen con selector de rol para la demo (no hay backend aún)
- Guard `_authenticated` redirige a `/login` si no hay user
- Layout `_authenticated/admin/` chequea `role === 'admin'`
- Nav superior cambia según rol:
  - Solicitor: Dashboard · New handoff · Mi inbox
  - Receiving: Inbox · Dashboard
  - Admin: Dashboard · Users · Firma settings

Cuando conectemos el REST real, esta capa pasa a JWT o cookie según defina el backend — la UI no cambia.

---

## 5. Pantallas (flujo end-to-end)

| # | Pantalla | Contenido clave |
|---|----------|-----------------|
| 1 | **Landing** `/` | Hero Onyx + tagline del manual, propuesta de valor en 3 columnas, CTA "Sign in" |
| 2 | **Login** `/login` | Card centrada, email/password (mock), selector de rol demo, link "olvidé contraseña" |
| 3 | **Dashboard** `/dashboard` | KPIs (matters activos, deadlines esta semana, handoffs pendientes), tabla de matters con filtros (estado, court, próxima audiencia), búsqueda |
| 4 | **Nuevo handoff** `/handoffs/new` | Wizard: ① matter info (case_name, matter_type, court, parties, next_hearing) → ② upload multi-PDF con dropzone y progreso de indexación por archivo → ③ review + confirmar |
| 5 | **Matter overview** `/handoffs/:id` | Header con case_name, court, parties, status chip. Tabs: Overview · Chat · Note · Updates · Sources. Overview muestra MatterReview estructurado: stage, último evento, deadlines, urgent issues, missing docs, next step — todo con CitationChips |
| 6 | **Chat con citas** `/handoffs/:id/chat` | Layout split: panel izq mensajes, panel der "fuentes consultadas" con chunks resaltados. Cada respuesta del assistant renderiza inline `[Doc: x, p.y]` clickeables que abren el chunk en el panel der. Estado "Insufficient evidence in the file" con styling de warning |
| 7 | **Handover note** `/handoffs/:id/note` | Documento estilo brief ejecutivo: executive_summary, current status, next step, deadlines, risk flags, task scope, file-based facts, strategic notes. Botón "Descargar PDF" (mock: genera un blob con jsPDF localmente para la demo) |
| 8 | **Updates** `/handoffs/:id/updates` | Timeline cronológico + form "Registrar acción": what_was_done, what_happened, what_follows, upload PDFs nuevos, hearing date. Genera update card con citas |
| 9 | **Source register** `/handoffs/:id/sources` | Tabla: Document · Pages · Privilege flag · Status (indexed/processing/error) · Chunks count |
| 10 | **Inbox (Receiving)** `/inbox` | Lista de handoffs recibidos con CTA "Aceptar y revisar" |
| 11 | **Admin** `/admin` + `/admin/users` | Listado de matters de toda la firma + gestión de usuarios (rol, estado) |

---

## 6. Pasos de implementación (incrementales, te muestro cada uno en preview antes de seguir)

1. **Design system**: tokens en `styles.css`, fonts, re-tematizar shadcn, componentes de marca base, landing + login funcionales con la estética del manual
2. **Auth mock + shell autenticado**: contexto, guards, nav superior dependiente de rol, layout `_authenticated`
3. **Capa mock API + Dashboard**: tipos, mock-data con 4-5 matters realistas, dashboard con KPIs y tabla
4. **Wizard de nuevo handoff**: 3 pasos, dropzone multi-PDF, simulación de indexación con progreso
5. **Matter overview + Sources**: tabs, MatterReview estructurado con CitationChips, tabla de sources
6. **Chat con citas**: split layout, mensajes, tooltips/panel de chunks, manejo de "Insufficient evidence"
7. **Handover note + descarga PDF**: layout brief ejecutivo, generación PDF cliente con jsPDF
8. **Updates**: timeline + form post-action
9. **Inbox Receiving + Admin**: pantallas específicas de rol
10. **Pulido**: animaciones (motion 120/180/240ms), pulse del chip handoff, modo oscuro, responsive, microcopy según tono del manual

---

## Detalles técnicos

- **Stack ya instalado**: TanStack Start + Router, React Query, Tailwind v4, shadcn, sonner, react-hook-form, zod
- **A instalar**: `framer-motion` (motion suave del manual), `jspdf` (descarga PDF mock client-side), `lucide-react` ya viene
- **Sin Lovable Cloud todavía** — todo mock en memoria + localStorage. Cuando llegue el momento de conectar al REST de CasePass, solo cambio `src/lib/api/index.ts` para apuntar al backend real (con `fetch` + base URL configurable vía `import.meta.env.VITE_API_BASE`).
- **Tono del UI copy**: editorial legal — "solicitor", "counsel", "matter", "proceedings", evitando jerga US ("attorney", "lawsuit"). Como dicta el manual.
- **Routing limpio**: cada sección su ruta propia (SEO friendly), nada de anclas.
- **Accesibilidad**: contraste AA garantizado por la paleta del manual, focus rings con `--cp-shadow-glow`, labels en todos los inputs.

Cuando aprueba este plan, arranco por el paso 1 (design system + landing + login) para que veas la marca aplicada antes de meternos en el flujo de matters.
