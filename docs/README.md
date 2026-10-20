# Documentación de R.I.Planta

Esta carpeta explica **qué entrega el proyecto**, **por qué está construido así** y
**cómo continuar aprendiendo** sin tener que reconstruir las decisiones desde el código.

## Ruta rápida

1. Instala dependencias desde la raíz: `pnpm install`.
2. Arranca el backend en una terminal: `pnpm --filter backend run start:dev`.
3. Arranca el frontend en otra: `pnpm --filter frontend run dev`.
4. Abre la URL que muestre Vite, normalmente `http://localhost:5173`.
5. Lee la [especificación funcional](./spec.md) y prueba la checklist manual.
6. Lee la [arquitectura](./architecture.md) y las [decisiones](./decisions.md) antes
   de cambiar persistencia, autenticación o UI.

La [matriz de verificación](./verification.md) distingue lo automatizado de la
verificación manual y explica cómo limpiar MongoDB entre ejecuciones.

## Verificación automatizada

Desde la raíz del repositorio:

```bash
pnpm install

# Pruebas unitarias y e2e del backend
pnpm --filter backend run test
pnpm --filter backend run test:e2e

# Pruebas unitarias del frontend
pnpm --filter frontend run test

# Compilación de ambos proyectos
pnpm --filter backend run build
pnpm --filter frontend run build

# Linters
pnpm --filter backend run lint
pnpm --filter frontend run lint
```

El backend usa MongoDB. Antes de arrancarlo, levanta la base de datos:

```bash
docker compose up -d mongo
```

Puedes copiar `backend/.env.example` como `backend/.env` si quieres cambiar la URI,
aunque la URI mostrada ya es el valor predeterminado. Al arrancar por primera vez,
Nest crea las colecciones, índices únicos y dos documentos semilla por colección. Los
datos ahora sí sobreviven al reinicio del backend porque viven en el volumen Docker.

## Verificación manual de resultados

| Resultado | Pasos | Resultado esperado |
|---|---|---|
| Explorar | Abre `Cementerio` y usa la búsqueda | Las tarjetas se filtran por planta o jardinero |
| Recordar | Selecciona una tarjeta | Aparece el detalle con epitafio y causa |
| Participar | Pulsa `Dar corona` | El contador aumenta y aparece una confirmación visual |
| Publicar | `+ Publicar` → completa campos → `Publicar lápida` | Regresas al cementerio y aparece la nueva tarjeta |
| Rankings | Abre `Rankings` | Las plantas aparecen ordenadas por coronas |
| Categorías | Abre `Categorías` → agrega, edita y elimina | La lista refleja cada operación y pide confirmación al eliminar |
| Perfil | Abre `Mi perfil` | Se muestran estadísticas y las lápidas publicadas por `Tú` |

Si el backend no está levantado, la interfaz **no entra en modo demostración**: informa
el error y no presenta cambios como si estuvieran guardados. Los datos simulados se
reservan para los mocks de las pruebas. Con MongoDB y el backend activos, las peticiones
se envían a `http://localhost:3000` y persisten.

## Probar la API directamente

```bash
curl http://localhost:3000/lapidas
curl http://localhost:3000/categorias

curl -X POST http://localhost:3000/lapidas \
  -H 'Content-Type: application/json' \
  -d '{"nombrePlanta":"Monstera","epitafio":"Siempre recordada","fechaFallecimiento":"2025-01-01","categoriaId":1,"causaMuerte":"Poca luz"}'

curl -X POST http://localhost:3000/lapidas/1/corona
```

Para detener el modo desarrollo, pulsa `Ctrl+C` en cada terminal.

## Método usado

- **SDD (Specification-Driven Development):** cada capacidad se expresa como contrato,
  criterios de aceptación y casos de error antes de considerarse terminada.
- **ODD (Outcome-Driven Development):** las tareas se priorizan por el resultado que
  una persona puede observar: publicar una lápida, recordarla, coronarla y organizar
  categorías.
- **Gentle AI:** se aplicó un enfoque de cambios pequeños, reversibles, explícitos y
  orientados a aprendizaje. No se añadió una dependencia o servicio externo llamado
  `gentle-ai` porque no está disponible en este workspace; el proceso queda documentado
  y reproducible con las herramientas del repositorio.

## Estado y límites intencionales

La aplicación es funcional de extremo a extremo con persistencia MongoDB. Al iniciar
por primera vez una base vacía, el backend inserta datos semilla. Autenticación y
autorización real son la siguiente iteración.
