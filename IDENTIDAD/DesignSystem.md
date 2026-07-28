# Sistema de Diseño — Moli (MOLIPAY)

> Basado en el Manual de Identidad Corporativa de Moli y el análisis completo de `/identidad`.
> Framework: React 19 + TanStack Start + Tailwind CSS v4 + shadcn/ui (New York).
> Icon library: Lucide.

---

## 1. Filosofía de Diseño

Moli es un neobanco que comunica **accesibilidad, modernidad y fluidez**. El diseño debe reflejar:

- **Formas redondeadas y amigables** — consistentes con la geometría del logotipo
- **Minimalismo funcional** — cada elemento tiene un propósito
- **Contraste controlado** — el rojo corporativo como acento, el azul como ancla visual
- **Jerarquía clara** — tipografía geométrica (Josefin Sans) como columna vertebral

---

## 2. Colores

### 2.1 Colores primarios

| Token | HEX | RGB | HSL | Uso |
|---|---|---|---|---|
| `--moli-red` | `#D21523` | `210, 21, 35` | `356°, 82%, 45%` | Acciones principales, botones primarios, acentos, marca |
| `--moli-blue` | `#334596` | `51, 69, 150` | `229°, 49%, 39%` | Elementos secundarios, navegación, headers, iconos |

### 2.2 Colores secundarios

| Token | HEX | RGB | HSL | Uso |
|---|---|---|---|---|
| `--moli-light-blue` | `#9CB0D9` | `156, 176, 217` | `220°, 45%, 73%` | Fondos de sección, info banners, hover states |
| `--moli-gray` | `#8C9297` | `140, 146, 151` | `207°, 5%, 57%` | Textos secundarios, bordes, placeholders, disabled |

### 2.3 Paleta extendida (derivada)

| Token | HEX | Uso |
|---|---|---|
| `--moli-red-dark` | `#A8101C` | Hover de botón primario |
| `--moli-red-darker` | `#7E0C15` | Active / pressed de botón primario |
| `--moli-red-light` | `#FEF2F3` | Fondos de alertas / badges en rojo suave |
| `--moli-blue-dark` | `#25336B` | Hover de botón secundario, sidebar activa |
| `--moli-blue-darker` | `#1A244D` | Active / pressed |
| `--moli-blue-light` | `#EEEFF8` | Fondos de tabla, cards secundarios |
| `--moli-white` | `#FFFFFF` | Fondos principales, cards |
| `--moli-black` | `#1D1D1B` | Textos principales (títulos) |
| `--moli-text` | `#2D2D2D` | Texto corporal |
| `--moli-text-muted` | `#6B7280` | Texto secundario / meta |
| `--moli-border` | `#D8DCE3` | Bordes generales |
| `--moli-bg` | `#F5F6F8` | Fondo de página / app |

### 2.4 Colores de estado

| Estado | HEX | Luz | Oscuro (hover/focus) | Fondo suave |
|---|---|---|---|---|
| **Success** | `#2E7D32` | `#4CAF50` | `#1B5E20` | `#E8F5E9` |
| **Error** | `#D21523` | `#E53935` | `#A8101C` | `#FEF2F3` |
| **Warning** | `#E67E22` | `#F39C12` | `#D35400` | `#FFF8E1` |
| **Info** | `#334596` | `#5C6DB5` | `#25336B` | `#EEEFF8` |

---

## 3. Tipografía

### 3.1 Fuentes

| Rol | Fuente | Pesos disponibles | Fallback |
|---|---|---|---|
| **Primaria** | Josefin Sans | 300 (Light), 400 (Regular), 600 (SemiBold), 700 (Bold) | `system-ui, sans-serif` |
| **Secundaria** | Null Free | 400 (Regular) | `cursive, sans-serif` |
| **Monospace** | IBM Plex Mono (existente) | 400, 500, 600 | `ui-monospace, monospace` |

### 3.2 Escala tipográfica

| Nivel | Tamaño | Line-Height | Peso | Font | Uso |
|---|---|---|---|---|---|
| **display** | 2.5rem (40px) | 1.2 | 300 (Light) | Josefin Sans | Hero, landing, bienvenida |
| **h1** | 2rem (32px) | 1.3 | 600 (SemiBold) | Josefin Sans | Títulos de página |
| **h2** | 1.5rem (24px) | 1.4 | 600 (SemiBold) | Josefin Sans | Títulos de sección |
| **h3** | 1.25rem (20px) | 1.4 | 600 (SemiBold) | Josefin Sans | Subtítulos de card |
| **h4** | 1.125rem (18px) | 1.5 | 600 (SemiBold) | Josefin Sans | Encabezados menores |
| **body-lg** | 1rem (16px) | 1.6 | 400 (Regular) | Josefin Sans | Cuerpo grande |
| **body** | 0.875rem (14px) | 1.6 | 400 (Regular) | Josefin Sans | Cuerpo default |
| **body-sm** | 0.75rem (12px) | 1.5 | 400 (Regular) | Josefin Sans | Texto pequeño, meta |
| **caption** | 0.6875rem (11px) | 1.4 | 400 (Regular) | Josefin Sans | Etiquetas, captions |
| **overline** | 0.75rem (12px) | 1.2 | 600 (SemiBold) | Josefin Sans | Overlines, labels |

### 3.3 Jerarquía visual

```
DISPLAY  → Josefin Sans Light 300, 2.5rem
─────────────────────────────────────────
ENCABEZADO GRANDE  → Josefin Sans SemiBold 600, 2rem
─────────────────────────────────────────
Subtítulo  → Josefin Sans SemiBold 600, 1.25rem
─────────────────────────────────────────
Cuerpo de texto  → Josefin Sans Regular 400, 0.875rem
─────────────────────────────────────────
Meta / caption  → Josefin Sans Regular 400, 0.75rem
```

---

## 4. Espaciados

### 4.1 Escala de espaciado

Basado en sistema de 4px (consistente con Tailwind):

| Token | Rem | Px | Uso común |
|---|---|---|---|
| `space-0` | 0 | 0 | Sin espacio |
| `space-1` | 0.25rem | 4 | Gap mínimo, padding interno de badges |
| `space-2` | 0.5rem | 8 | Padding interno de inputs, chips |
| `space-3` | 0.75rem | 12 | Padding de botones, gap entre elementos |
| `space-4` | 1rem | 16 | Padding de cards, gap de sección |
| `space-5` | 1.25rem | 20 | Padding de contenedores |
| `space-6` | 1.5rem | 24 | Márgenes laterales de página |
| `space-8` | 2rem | 32 | Separación entre secciones |
| `space-10` | 2.5rem | 40 | Separación mayor |
| `space-12` | 3rem | 48 | Separación de bloques grandes |
| `space-16` | 4rem | 64 | Separación de landing / hero |
| `space-20` | 5rem | 80 | Separación máxima |

### 4.2 Reglas de espaciado

| Contexto | Regla |
|---|---|
| **Márgenes de página** | `space-6` (1.5rem) en cada lado |
| **Gap entre cards** | `space-4` (1rem) |
| **Padding interno de card** | `space-4` (1rem) |
| **Separación título-contenido** | `space-3` (0.75rem) |
| **Separación entre secciones** | `space-8` (2rem) |
| **Padding de botón** | `space-2` vertical + `space-4` horizontal |
| **Padding de input** | `space-2` vertical + `space-3` horizontal |
| **Gap entre filas de tabla** | 0 (border-collapse) |
| **Padding de celda de tabla** | `space-2` vertical + `space-3` horizontal |
| **Gap en grupos de botones** | `space-2` (0.5rem) |

---

## 5. Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `radius-none` | 0 | Sin borde redondeado |
| `radius-sm` | 0.25rem (4px) | Badges, chips pequeños |
| `radius-md` | 0.375rem (6px) | Inputs, botones, tablas |
| `radius-lg` | 0.5rem (8px) | Cards, dropdowns, modales |
| `radius-xl` | 0.75rem (12px) | Modales grandes, contenedores principales |
| `radius-2xl` | 1rem (16px) | Drawers, panels |
| `radius-full` | 9999px | Pills, badges redondos, avatares |

> **Coherencia:** shadcn/ui New York usa `radius: 0.625rem` como base. Es compatible con usar `radius-md` para inputs y `radius-lg` para cards.

---

## 6. Sombras

| Token | Valor | Uso |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(51, 69, 150, 0.04)` | Elementos sutiles |
| `shadow-sm` | `0 1px 3px rgba(51, 69, 150, 0.06), 0 1px 2px rgba(51, 69, 150, 0.04)` | Cards, inputs |
| `shadow-md` | `0 4px 6px rgba(51, 69, 150, 0.07), 0 2px 4px rgba(51, 69, 150, 0.04)` | Dropdowns, tarjetas elevadas |
| `shadow-lg` | `0 10px 15px rgba(51, 69, 150, 0.08), 0 4px 6px rgba(51, 69, 150, 0.03)` | Modales, tooltips |
| `shadow-xl` | `0 20px 25px rgba(51, 69, 150, 0.10), 0 8px 10px rgba(51, 69, 150, 0.04)` | Drawers, notificaciones |
| `shadow-blue` | `0 0 0 3px rgba(51, 69, 150, 0.15)` | Focus ring de inputs |
| `shadow-red` | `0 0 0 3px rgba(210, 21, 35, 0.15)` | Focus ring de botón primario |

---

## 7. Botones

### 7.1 Variantes

| Variante | Background | Texto | Border | Hover | Active | Disabled |
|---|---|---|---|---|---|---|
| **Primary** | `#D21523` | `#FFFFFF` | none | `#A8101C` | `#7E0C15` | `#F5A0A6`, texto `#FFFFFF` 50% |
| **Secondary** | `#334596` | `#FFFFFF` | none | `#25336B` | `#1A244D` | `#949FD3`, texto `#FFFFFF` 50% |
| **Outline** | transparent | `#D21523` | `#D21523` 1.5px | `#FEF2F3` | `#F5A0A6` 20% | `#D8DCE3`, texto `#D8DCE3` |
| **Ghost** | transparent | `#334596` | none | `#EEEFF8` | `#949FD3` 20% | `#D8DCE3` |
| **Destructive** | `#C62828` | `#FFFFFF` | none | `#B71C1C` | `#8E0000` | `#EF9A9A` |

### 7.2 Tamaños

| Tamaño | Padding | Font | Radius | Height |
|---|---|---|---|---|
| **sm** | 0.375rem 0.75rem | 0.75rem | 0.375rem | 2rem (32px) |
| **md (default)** | 0.5rem 1rem | 0.875rem | 0.5rem | 2.5rem (40px) |
| **lg** | 0.75rem 1.5rem | 1rem | 0.5rem | 3rem (48px) |
| **xl** | 1rem 2rem | 1.125rem | 0.625rem | 3.5rem (56px) |

### 7.3 Estados visuales

- Transition: `150ms ease-in-out` en background, color, border, shadow
- Cursor: `pointer` (default), `not-allowed` (disabled)
- Outline offset: 2px
- Focus ring: `shadow-blue` o `shadow-red` según la variante

---

## 8. Inputs

| Propiedad | Valor |
|---|---|
| **Background** | `#FFFFFF` |
| **Border** | `1.5px solid #D8DCE3` |
| **Border focus** | `1.5px solid #334596` |
| **Focus ring** | `0 0 0 3px rgba(51, 69, 150, 0.15)` |
| **Radius** | `0.375rem` |
| **Padding** | `0.5rem 0.75rem` |
| **Font** | Josefin Sans 0.875rem |
| **Placeholder** | `#8C9297` (gray) |
| **Disabled** | background `#F5F6F8`, texto `#8C9297` |
| **Error state** | border `#D21523`, ring `rgba(210, 21, 35, 0.15)` |
| **Height (default)** | 2.5rem (40px) |
| **Label** | Josefin Sans 0.75rem SemiBold, color `#334596`, margin-bottom 0.375rem |
| **Helper text** | Josefin Sans 0.6875rem Regular, color `#8C9297` |

---

## 9. Cards

| Propiedad | Valor |
|---|---|
| **Background** | `#FFFFFF` |
| **Border radius** | `0.5rem` (lg) |
| **Shadow** | `shadow-sm` |
| **Padding** | 1.25rem (1.5rem en variante espaciada) |
| **Border** | `1px solid #D8DCE3` (opcional, sutil) |
| **Header** | Josefin Sans 1rem SemiBold, color `#1D1D1B` |
| **Body** | Josefin Sans 0.875rem Regular, color `#2D2D2D` |
| **Separator** | `1px solid #F5F6F8` |

---

## 10. Tablas

| Propiedad | Valor |
|---|---|
| **Header bg** | `#EEEFF8` |
| **Header text** | Josefin Sans 0.75rem SemiBold, `#334596` |
| **Row even bg** | `#F5F6F8` |
| **Row hover** | `#EEEFF8` |
| **Cell padding** | 0.5rem 0.75rem |
| **Cell text** | Josefin Sans 0.875rem Regular |
| **Border** | `1px solid #D8DCE3` |
| **Radius** | `0.375rem` |
| **Empty state** | Josefin Sans 0.875rem Regular, `#8C9297`, centrado |

---

## 11. Modales / Dialogs

| Propiedad | Valor |
|---|---|
| **Overlay bg** | `rgba(29, 29, 27, 0.6)` |
| **Content bg** | `#FFFFFF` |
| **Border radius** | `0.75rem` (xl) |
| **Shadow** | `shadow-xl` |
| **Padding** | 1.5rem |
| **Width (sm)** | 24rem (384px) |
| **Width (md)** | 32rem (512px) |
| **Width (lg)** | 40rem (640px) |
| **Header** | Josefin Sans 1.25rem SemiBold |
| **Close button** | Ghost variant, icono Lucide `X` |
| **Animation** | scale-in + fade-in, 200ms ease-out |

---

## 12. Badges

| Variante | Background | Texto | Border radius |
|---|---|---|---|
| **default** | `#EEEFF8` | `#334596` | `0.25rem` |
| **primary** | `#D21523` | `#FFFFFF` | `0.25rem` |
| **success** | `#E8F5E9` | `#2E7D32` | `0.25rem` |
| **warning** | `#FFF8E1` | `#E67E22` | `0.25rem` |
| **error** | `#FEF2F3` | `#D21523` | `0.25rem` |
| **info** | `#EEEFF8` | `#334596` | `0.25rem` |
| **outline** | transparent | `#334596` | `0.25rem` |

**Tamaños:** Font 0.75rem, padding 0.125rem 0.5rem, font-weight 600.

---

## 13. Chips / Tags

| Propiedad | Valor |
|---|---|
| **Background** | `#F5F6F8` |
| **Text** | Josefin Sans 0.75rem, `#334596` |
| **Border** | `1px solid #D8DCE3` |
| **Radius** | `9999px` (full) |
| **Padding** | 0.2rem 0.625rem |
| **Icon** | Lucide, 14px, margin-right 0.25rem |
| **Close (remove) icon** | Lucide `X`, 12px, margin-left 0.25rem, hover `#D21523` |

---

## 14. Iconografía

- **Librería:** Lucide (ya integrada en el proyecto)
- **Tamaños estándar:** 14px (inline), 16px (botones), 20px (inputs), 24px (header actions), 32px (empty states)
- **Color default:** `currentColor`
- **Color por defecto en navegación:** `#334596`
- **Icono de carga / spinner:** Lucide `LoaderCircle` con animación spin
- **Estilo pictograma:** Trazo consistente (`strokeWidth: 1.5–2`), redondeado, consistente con la geometría del logo

---

## 15. Estilo fotográfico

- **Tratamiento:** Imágenes corporativas con overlay de color azul `#334596` al 15–20% de opacidad
- **Formato:** Preferir imágenes de alta calidad, bien iluminadas, con espacio negativo
- **Evitar:** Filtros vintage, desenfoques excesivos, saturaciones extremas
- **Consistencia:** Mantener una paleta de color coherente con los valores de la marca

---

## 16. Uso del logotipo

### 16.1 Variantes y cuándo usarlas

| Variante | Archivo | Cuándo usar |
|---|---|---|
| **Original (multicolor)** | `Logo-MOLI-ORIGINAL.png` | **Por defecto.** En headers, login, footers, documentación oficial |
| **Rojo sólido** | `2.png` | Aplicaciones donde se requiera una versión monocromática en rojo |
| **Negro** | `4.png` | Fondos muy oscuros (negativo invertido) o impresión B/N |
| **Blanco** | `5.png` | Fondos oscuros o fotográficos (negativo claro) |
| **Azul** | `Sin-título-1.png` | Contextos donde predomine el azul corporativo |

### 16.2 Reglas de uso

- Mantener la proporción original (2:1 aproximado)
- No rotar, deformar, ni cambiar colores
- No separar icono de texto
- Respetar el área de seguridad (margen mínimo = 1× altura de la "O")
- No aplicar sombras al logo
- No colocar sobre fondos de poco contraste

### 16.3 Tamaños mínimos recomendados

| Contexto | Ancho mínimo |
|---|---|
| Web / Apps | 120px |
| Merch | 200px |
| Impresión | 1.5 pulgadas (260px) |

---

## 17. Ilustraciones

- **Estilo:** Vectorial plano, con formas redondeadas, trazos orgánicos
- **Paleta:** Exclusivamente colores corporativos (#D21523, #334596, #9CB0D9, #8C9297)
- **Formato:** SVG preferido; PNG para exportación estática
- **Iconos maestros:** El archivo `ICONOGRAFIA.ai` contiene la iconografía oficial en formato editable
- **Uso:** Acompañar mensajes de estado vacío (empty states), onboarding, landing pages
- **Evitar:** Fotos de stock genéricas, ilustraciones con colores externos a la paleta

---

## 18. Gráficos decorativos

- **Origen:** Los `Recurso *.png` y `ICONOGRAFIA.ai` son la fuente de gráficos decorativos
- **Colores:** Respetan la paleta (azul dominante, rojo como acento, blanco como espacio negativo)
- **Posición:** Esquinas, laterales, fondos de sección — nunca sobre texto importante
- **Opacidad:** Hasta 15–30% cuando funcionan como fondo
- **Vector editable:** Siempre preferir `ICONOGRAFIA.ai` como fuente para modificar escalas

---

## 19. Fondos

| Tipo | Valor | Uso |
|---|---|---|
| **App bg** | `#F5F6F8` | Fondo de página general |
| **Surface** | `#FFFFFF` | Cards, modales, contenedores |
| **Sidebar bg** | `#334596` o `#FFFFFF` según variante |
| **Header bg** | `#FFFFFF` + shadow-sm |
| **Banner/hero** | Degradado suave de `#334596` → `#1A244D` (dark blue) |
| **Empty state** | `#F5F6F8` con icono decorativo |
| **Overlay modal** | `rgba(29, 29, 27, 0.6)` |

---

## 20. Componentes reutilizables

| Componente | Ruta sugerida | Base UI |
|---|---|---|
| `Button` | `@/components/ui/button` | shadcn (existente) |
| `Input` | `@/components/ui/input` | shadcn (existente) |
| `Card` | `@/components/ui/card` | shadcn (existente) |
| `Table` | `@/components/ui/table` | shadcn (existente) |
| `Modal` | `@/components/ui/dialog` | shadcn Dialog (existente) |
| `Badge` | `@/components/ui/badge` | shadcn (existente) |
| `Sidebar` | `@/components/portal-shell` | Custom (existente) |
| `EmptyState` | `@/components/ui/empty-state` | Sugerido |
| `SectionHeader` | `@/components/ui/section-header` | Sugerido |
| `FilterChip` | `@/components/ui/filter-chip` | Sugerido |
| `StatusBadge` | `@/components/ui/status-badge` | Sugerido |
| `PageContainer` | `@/components/ui/page-container` | Sugerido |

---

## 21. Accesibilidad

| Regla | Detalle |
|---|---|
| **Contraste mínimo** | Relación de contraste ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande |
| **Red #D21523 sobre blanco** | Contraste ~5.5:1 — cumple AA para texto normal |
| **Azul #334596 sobre blanco** | Contraste ~6.8:1 — cumple AA |
| **Focus visible** | Todos los elementos interactivos deben tener un anillo de foco visible (2px outline + offset 2px) |
| **Labels** | Todos los inputs deben tener un `<label>` asociado |
| **Alt text** | Toda imagen debe tener texto alternativo descriptivo |
| **Roles ARIA** | Usar roles semánticos en modales, alerts, navegación |
| **Reducción de movimiento** | Respetar `prefers-reduced-motion` — desactivar animaciones no esenciales |
| **Tamaño táctil mínimo** | 44×44px para blancos táctiles en mobile |
| **Color no informativo** | No usar el color como único medio para transmitir información |

---

## 22. Elementos que NO deben utilizarse

- ❌ Colores fuera de la paleta corporativa (ni siquiera temporalmente)
- ❌ Sombras excesivas o degradados complejos no controlados
- ❌ Tipografías que no sean Josefin Sans o Null Free
- ❌ Variantes del logo que no estén en la carpeta oficial
- ❌ Iconos que no sean de Lucide o del set `ICONOGRAFIA.ai`
- ❌ Bordes redondeados inconsistentes (mezclar radius-sm con radius-2xl en el mismo contexto)
- ❌ Fotografías con filtros vintage o saturados
- ❌ Animaciones lentas (>300ms) o parpadeantes
- ❌ Overlays modales sin fondo semitransparente
- ❌ Badges con bordes no redondeados
- ❌ Texto centrado en contextos de lectura larga
- ❌ Uso del color rojo #D21523 como fondo extenso sin suficiente contraste con el texto

---

## 23. Buenas prácticas

- Usar el sistema de Design Tokens (`DesignTokens.css`) como única fuente de valores de diseño
- Preferir CSS personalizado sobre Tailwind utilities cuando se definan estilos compuestos
- Mantener la coherencia visual: si un botón es `rounded-md`, todos los botones deben ser `rounded-md`
- Los estados hover/focus/active deben definirse para todo componente interactivo
- Responsive: la escala tipográfica debe reducirse proporcionalmente en mobile (0.875× del tamaño base)
- Dark mode: invertir fondos y textos manteniendo los colores corporativos puros
- Los márgenes de página deben ser consistentes en todas las vistas
- Usar el `cn()` helper de shadcn para combinar clases condicionalmente
- Documentar cualquier desviación justificada del sistema de diseño

---

## 24. Breakpoints responsivos

| Breakpoint | Min width | Nombre Tailwind | Objetivo |
|---|---|---|---|
| Mobile | 0 | `sm:` (base) | Smartphones |
| Tablet | 640px | `md:` | Tablets |
| Desktop | 1024px | `lg:` | Laptops |
| Wide | 1280px | `xl:` | Desktop grandes |
| Ultra-wide | 1536px | `2xl:` | Pantallas ultra-wide |
