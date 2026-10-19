# Verificación de la entrega

## Qué está automatizado

| Capa | Comando | Cobertura |
|---|---|---|
| Backend unitario | `pnpm --filter backend run test` | Servicios y controladores |
| Backend HTTP + MongoDB | `pnpm --filter backend run test:e2e` | CRUD, validación, `404` y coronas |
| Backend compilación | `pnpm --filter backend run build` | TypeScript, Nest y esquemas Mongoose |
| Frontend compilación | `pnpm --filter frontend run build` | TypeScript y bundle Vite |
| Frontend lint | `pnpm --filter frontend run lint` | Reglas Oxlint configuradas |

## Orden recomendado

```bash
pnpm install
docker compose up -d mongo
pnpm --filter backend run test
pnpm --filter backend run test:e2e
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

## Qué no se ejecutó en este entorno

La sesión del agente no pudo iniciar comandos porque el sandbox carece de `bubblewrap`
o LXC. Por tanto, no se debe interpretar este cambio como una ejecución exitosa de los
comandos: hay que correrlos localmente después de `pnpm install`. La estructura de
pruebas sí está preparada para esa ejecución.
