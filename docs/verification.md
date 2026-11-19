# Verificación de la entrega

## Qué está automatizado

| Capa | Comando | Cobertura |
|---|---|---|
| Backend unitario | `pnpm --filter backend run test` | Servicios y controladores |
| Backend HTTP + MongoDB | `pnpm --filter backend run test:e2e` | CRUD, validación, `404`, coronas, perfil, recuperación de contraseña y límites de dimensiones al subir fotos |
| Backend compilación | `pnpm --filter backend run build` | TypeScript, Nest y esquemas Mongoose |
| Frontend unitario | `pnpm --filter frontend run test` | Cliente HTTP, contratos de API, login, perfil, validación previa de fotos y moderación de comentarios (Vitest) |
| Frontend compilación | `pnpm --filter frontend run build` | TypeScript y bundle Vite |
| Frontend lint | `pnpm --filter frontend run lint` | Reglas Oxlint configuradas |

## Orden recomendado

```bash
pnpm install
docker compose up -d mongo
pnpm --filter backend run test
pnpm --filter backend run test:e2e
pnpm --filter frontend run test
pnpm --filter backend run build
pnpm --filter frontend run build
pnpm --filter frontend run lint
```

Las pruebas e2e limpian las colecciones de MongoDB al terminar cada caso. Esto evita
que una ejecución contamine la siguiente. Si una prueba se interrumpe abruptamente,
puedes limpiar el entorno de desarrollo con:

```bash
docker compose exec mongo mongosh riplanta --eval 'db.dropDatabase()'
```

La primera ejecución recreará las semillas al iniciar Nest.

## Verificación de edición y presentación del perfil

El cambio de perfil se valida en estas capas:

| Comando | Resultado esperado |
|---|---|
| `pnpm --dir backend test --runInBand src/usuarios/usuarios.service.spec.ts` | Reglas de autorización, actualización opcional, almacenamiento de avatar y cambio de contraseña |
| `pnpm --dir backend test:e2e --runInBand usuarios.e2e-spec.ts` | Multipart autenticado, validación de contraseña actual, lectura pública del perfil, emisión y uso del código de recuperación, y cierre de sesiones |
| `pnpm --dir frontend test` | Formularios, tarjetas de perfil, límites de texto y estilos |
| `pnpm --dir backend build` / `pnpm --dir frontend build` | Compilación TypeScript y backend/frontend |
| `pnpm --dir backend lint` / `pnpm --dir frontend lint` | Reglas Oxlint del backend y frontend |

Para validar manualmente, inicia MongoDB, backend y frontend. Edita el perfil con cada
campo por separado y luego en conjunto; al cambiar la imagen, compara la original con la
vista previa; confirma que un cambio de contraseña requiere la actual. Abre `Perfiles`
para comprobar el avatar y descripción guardados. Envía un formulario con datos inválidos
y reintenta sin cambiar el error para verificar que la señal visual vuelve a ejecutarse.

## Verificación de recuperación y validación previa de fotos

| Comando | Resultado esperado |
| --- | --- |
| `pnpm --dir frontend test src/features/lapidas/model/validar-foto.test.ts` | Tipo, tamaño o dimensiones inválidos se informan en el campo antes de publicar |
| `pnpm --dir frontend test src/features/sesiones/ui/RecuperarPage.test.tsx` | La pantalla envía el código y muestra el resultado sin sesión |

Vitest admite el filtro de archivo directamente; `--runInBand` es una opción de Jest
y solo aplica a los comandos del backend.
