# Recuperación de contraseña sin email

Objetivo: que cada usuario pueda recuperar su contraseña con un código de un solo uso, sin email ni SMS, y que el admin pueda emitir uno para quien lo perdió. Sin dependencias nuevas.
Rama: `copilot/working-copy` · Entrega: local, commits por work unit (la decisión de PR encadenado queda diferida hasta que se autorice push/PR) · Runners: jest (backend, unit + e2e) y vitest + `tsc -b` + `oxlint` + `vite build` (frontend).

## Specs

### S1 — Código de recuperación en el alta
- `POST /usuarios` sigue auto-logueando y creando la cookie de sesión, y además devuelve `codigoRecuperacion` en el cuerpo.
- El código tiene 16 caracteres base32 (alfabeto RFC 4648 `A-Z2-7`), se muestra agrupado como `ABCD-EFGH-IJKL-MNOP`.
- Se genera con `randomInt` de `node:crypto`, sin sesgo de módulo (32 = potencia de 2).
- La base guarda **solo** el SHA-256 del código normalizado en `codigoRecuperacionHash`. El código en claro no se guarda ni se puede volver a leer.
- `codigoRecuperacionHash` usa `select: false`: ninguna lectura del modelo que no lo pida explícitamente lo devuelve.

### S2 — Recuperación pública
- `POST /usuarios/recuperar` recibe `{ username, codigo, password }` y responde `200` en el caso feliz.
- Normaliza el código: quita guiones y espacios, pasa a mayúsculas.
- Si `username` + código no coinciden responde `400` con el mensaje genérico `El usuario y el código no coinciden.` — el mismo para usuario inexistente, código inválido y código ya usado.
- **No** hashea la contraseña nueva si el código no coincide: primero valida el SHA-256 barato, y solo después gasta bcrypt. Así un flood no satura el event loop.
- En el caso feliz: guarda el hash bcrypt de la nueva contraseña, borra `codigoRecuperacionHash` (un solo uso), invalida **todas** las sesiones del usuario y responde `200`.
- La contraseña nueva exige 8..72 caracteres, igual que el alta.
- La respuesta del caso feliz es `{ mensaje: 'Tu contraseña se actualizó. Iniciá sesión con la nueva.' }`.

### S3 — Emisión de código desde la sesión
- `POST /usuarios/:id/codigo-recuperacion` exige sesión iniciada (`401` sin ella).
- Un `admin` puede emitir un código para cualquier usuario, sin pedir contraseña.
- El dueño puede emitir un código para sí mismo solo si manda `passwordActual` correcta; si falta o no coincide responde `403` con `La contraseña actual no es correcta`.
- Un tercero no-admin recibe `403`.
- Responde `200` con `{ codigoRecuperacion }` en claro, una sola vez. Guarda solo el hash y reemplaza el código anterior: el anterior deja de servir.
- Un id con formato inválido responde `404`. Un id válido pero inexistente responde `404` a quien está autorizado a saberlo (admin o dueño); un tercero no-admin recibe `403` **antes** de mirar si existe, para no filtrar qué cuentas hay.

### S4 — UI de recuperación
- `LoginPage` muestra un enlace `¿OLVIDASTE TU CONTRASEÑA?` que navega a la vista `recuperar`.
- `RecuperarPage` pide usuario, código de recuperación, nueva contraseña y confirmación.
- Valida en cliente antes de llamar: usuario obligatorio (máx. 50), código obligatorio, contraseña 8..72, confirmación igual.
- Llama a `sesionesApi.recuperar`; si el backend responde error muestra su mensaje; si no es `ApiError`, `No se pudo recuperar la contraseña.`
- Al éxito muestra el aviso `Tu contraseña se actualizó. Iniciá sesión con la nueva.` y deja el enlace para volver al login, sin volver a mostrar el formulario.
- `RestablecerPage` y la variante `'restablecer'` de `VistaAuth` se eliminan: la recuperación en un solo paso las deja sin uso.

### S5 — UI de entrega del código
- `RegistroPage`, después de crear la cuenta, muestra el código una sola vez, con la advertencia de que no se vuelve a mostrar y un botón para entrar al cementerio. El registro ya no navega solo: espera a que el usuario confirme que guardó el código.
- `PerfilPage`, en el perfil propio, agrega la sección `CÓDIGO DE RECUPERACIÓN`: pide la contraseña actual, emite un código nuevo y lo muestra una sola vez, avisando que reemplaza al anterior.
- `PerfilesPage`, cuando un admin mira el perfil de otra persona, ofrece `EMITIR CÓDIGO DE RECUPERACIÓN` para ese usuario y muestra el código una sola vez.
- Los códigos mostrados usan el formato `ABCD-EFGH-IJKL-MNOP`.

## Tasks

- [x] T1 — Backend: utilidades del código (`codigo-recuperacion.ts`) + campo en `usuario.schema.ts` + spec. Ruta: inline. S1. RED observado (módulo y campo ausentes) → 7 tests verdes en `codigo-recuperacion.spec.ts` + `usuario.schema.spec.ts`.
- [x] T2 — Backend: `UsuariosService.crear` devuelve `{ usuario, codigoRecuperacion }`; `recuperar`; `emitirCodigoRecuperacion`; `SesionesService.cerrarTodasDeUsuario`; unit tests. Ruta: inline. S1, S2, S3. RED observado (`emitirCodigoRecuperacion is not a function`) → 37 tests verdes en 4 suites.
- [x] T3 — Backend: DTOs, rutas, middleware y e2e. Ruta: inline. S2, S3. Unit backend 145/145 y `nest build` limpio; **e2e 56/56 en 5 suites** (15 de `usuarios`, 7 nuevos de recuperación) contra un `mongod` local (ver L5).
- [x] T4 — Frontend: `sesionesApi.recuperar`, `RecuperarPage` real, link en `LoginPage`, borrar `RestablecerPage` y `'restablecer'`, tests. Ruta: inline. S4. RED observado (8 fallos por campos/API/link ausentes) → verde.
- [x] T5 — Frontend: `sesionesApi.registrar` devuelve `{ sesion, codigoRecuperacion }`; pantalla de código en `RegistroPage`; `App` espera la confirmación. Ruta: inline. S5. RED observado → verde.
- [x] T6 — Frontend: emisión de código en `PerfilPage` (dueño) y `PerfilesPage` (admin) + `usuariosApi.emitirCodigoRecuperacion`; tests. Ruta: inline. S5. RED observado (6 fallos) → verde.
- [x] T7 — Verificación final: suites backend y frontend, `tsc -b`, `oxlint`, `vite build`; verifier independiente por ser cambio de seguridad. Ruta: verificación delegada. Sin blockers (ver L6).
- [x] T8 — Backend: invertir el orden de la recuperación para que el cierre de sesiones ocurra **antes** del commit de la contraseña, y fijar el camino de fallo con test. Ruta: inline. S2. RED observado en el e2e nuevo (el código ya estaba consumido tras el cierre fallido) → unit backend 146/146, e2e **58/58** en 5 suites, `nest build` OK.

## Log

### L1 — Pedido (sesión previa, resumido)
> Implementar autoservicio de recuperación de contraseña sin email: código de recuperación de un solo uso, generado al registrarse y regenerable desde el perfil; el admin puede emitir uno para quien lo perdió.

Seguimiento textual del usuario en esta sesión:

> Va, implementalo

### Decisiones tomadas
- Código de 16 caracteres base32 (80 bits), mostrado en 4 grupos de 4. Sin expiración por tiempo: el control es un solo uso + rotación.
- Se descartó clave temporal y flag de cambio obligatorio: un solo mecanismo (código) cubre usuario y admin.
- `POST /usuarios/recuperar` valida primero el hash SHA-256 del código y solo hashea la contraseña nueva si coincide.
- El admin emite para cualquiera; el dueño debe probar la contraseña actual. La autorización vive en el servicio, no en el middleware, porque depende del rol **y** del dueño.
- La invalidación de sesiones se orquesta en el controlador (que ya orquesta `crear` + `iniciar`), para no invertir la dependencia circular `UsuariosService` ⇄ `SesionesService`.
- La pantalla de código del registro no navega sola: el usuario confirma que lo guardó. Si lo pierde, puede regenerarlo desde su perfil.

### L2 — Verificación parcial (frontend y backend unit)
- Frontend: `vitest run` 181/181 en 24 archivos **en este árbol**; 179 de ellos son de HEAD, los 2 extra vienen de `estilos.test.ts`, que la otra sesión modificó sin commitear. `tsc -b` sin salida; `oxlint` sin hallazgos; `vite build` OK.
- Backend: `jest` unit 145/145 en 19 suites; `nest build` OK.
- `tsc --noEmit -p tsconfig.json` falla, pero **idéntico al baseline**: comprobado con `git archive HEAD` en `/tmp/opencode/base-backend` (mismos archivos y errores, solo cambian los números de línea). `nest build` excluye `*spec.ts` y `test/`, y es el chequeo real del paquete.

### L3 — Bloqueo de entorno para los e2e
`docker ps` falla: el daemon está `inactive` y `sudo -n systemctl start docker` pide contraseña. No hay `mongod` local ni nada escuchando en 27018. Los e2e de T3 queda escritos y sin ejecutar; no se puede afirmar S2/S3 verificados end-to-end hasta levantarlo. Pendiente de que el usuario inicie Docker.

### L4 — Commit del frontend y evaluación nativa
- `d9071b9 feat(frontend): recuperar contraseña con código de un solo uso` (frontend + tests + borrado de `RestablecerPage`).
- `gentle-ai review assess --cwd . --agent opencode --base-ref b9fc5a4 --committed-only --json --untracked-scope=exclude --expected-untracked-inventory=sha256:8328...`: riesgo `medium` (`executable_change`, App.test.tsx), `review_due: false` (`under_budget`, 25 paths, 1147 líneas). El slice abierto sigue pendiente.
- El backend **no se commitea todavía**: es la parte que toca autorización de verdad y sus e2e no corrieron.

### L5 — E2E desbloqueados sin Docker y commit del backend
- Docker sigue caído (`/var/run/docker.sock` no existe) y `sudo -n` pide contraseña, así que L3 se resolvió **sin tocar el repo ni agregar dependencias**: se bajó el binario oficial `mongod` 7.0.21 para ubuntu2204 a `~/.cache/riplant-e2e-mongo` y se lo dejó escuchando en `127.0.0.1:27018` con `--fork`. Es scratch de entorno, no un artefacto del proyecto (no está en el árbol ni en `package.json`).
- `jest --config ./test/jest-e2e.json`: **56/56 en 5 suites**. `usuarios.e2e-spec.ts` solo: 15/15, incluidos los 7 casos nuevos (alta con código, un solo uso + cierre de sesiones, error genérico, 400 de payload, 401/403 de emisión, rotación del dueño, admin emitiendo para cualquiera).
- `55baec2 feat(backend): recuperar contraseña con código de un solo uso` (13 archivos: utilidades, schema, servicio, controlador, módulo, DTOs, `cerrarTodasDeUsuario`, unit y e2e).
- Evaluación nativa `b9fc5a4..55baec2 --committed-only`: sin escalar daba `medium` / `review_due: false` (`under_budget`, 38 paths, 1958 líneas). Se escaló con `--escalate-item 2` (auth: recuperación sin sesión + rotación de secreto) a `high` / `review_due: true`; el candidate queda para el review nativo.
- Inventario de untracked ajeno cambió al commitear el backend: el hash canónico pasó a `sha256:9d4e12ac...`.

### L6 — Verifier independiente: sin blockers
- Veredicto por spec: **S1–S5 cumplen**. Evidencia dura: hash crudo = `sha256(código normalizado)` mientras la lectura normal no lo trae; formato `^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$`; 6 altas → 6 códigos distintos; mismo cuerpo de error para usuario inexistente / código malo / código usado; 2 pedidos simultáneos → exactamente `[200,400]`; tras recuperar, las dos cookies quedan 401; 7/73 → 400 y 8/72 → 200 sin consumir el código; inyección NoSQL en `username`/`codigo` → 400; 401/403/403 dueño/200 admin/404 id inválido.
- **Advisory (no se cambia código): 403 en vez de 404** para un tercero no-admin con id válido-inexistente. Es el orden intencional (autorizar antes de buscar) y evita filtrar qué cuentas existen; S3 se precisó en vez de torcer la implementación.
- **Advisory: flake preexistente** del 429 en `sesiones.e2e-spec.ts` (1 de 5 corridas paralelas); el rate limit no cambia en el rango.
- **Advisory: conteo de tests del frontend** (L2 corregido: 179 reproducibles desde HEAD; 181 en el árbol sucio).
- Gap real que sí se fijó: el test de un solo uso era secuencial, no concurrente. `a4395ab test(backend): fijar el un solo uso del código bajo concurrencia`, con RED por mutación (quitando `codigoRecuperacionHash` del filtro del `findOneAndUpdate`, la respuesta son dos 200).
- Comandos observados por el verifier: unit 145/145; e2e 56/56 en HEAD y 49/49 en baseline `b9fc5a4`; `nest build` 0; frontend 179/179 en HEAD (189 con sus probes), `tsc -b` 0, `oxlint` 0, `vite build` 0. `tsc --noEmit` backend falla igual que el baseline (preexistente).
- Con el test nuevo: unit 145/145, e2e **57/57** en 5 suites, `nest build` OK. Scratch del verifier borrado; el `mongod` de `~/.cache` se deja arriba por si hace falta.

### L7 — Review nativo: hallazgo CRITICAL y orden invertido
Review nativo sobre `d9071b9..a4395ab` (3 lentes: risk, resilience, reliability). Hallazgos:

- **CRITICAL (resilience)**: `recuperar` commiteaba la contraseña y borraba el código **antes** de que el controlador cerrara las sesiones. Si `cerrarTodasDeUsuario` rechazaba (error transitorio de Mongo), el request devolvía 500 con la contraseña ya cambiada, el código ya consumido y **los tokens viejos vivos**: justo lo que la feature evita, sin reintento posible.
- WARNING (reliability): no había test del camino de fallo parcial.
- WARNING (resilience): el flujo no emite logs/auditoría (el `Logger` del service no se usa en esta ruta).
- WARNING (risk): el admin puede emitir código para cualquiera, incluido otro admin, sin re-autenticación ni auditoría. Es el comportamiento pedido y documentado; queda como superficie intencional.
- SUGGESTION: SHA-256 sin pepper (seguro por los 80 bits del código), falta rate limiting en el endpoint público, spec de schema white-box.

Decisión del usuario: **invertir el orden**. Implementado en T8:

- `UsuariosService.recuperar` se partió en `identificarPorCodigo` (SHA-256 + `findOne`, barato) y `cambiarPasswordConCodigo` (bcrypt + `findOneAndUpdate` condicional por `_id` + hash, con `$unset` en la misma escritura).
- El controlador cierra sesiones **entre** los dos pasos. Si el cierre falla, no se tocó nada y el reintento con el mismo código sirve; si falla el commit después del cierre, el daño máximo es quedar deslogueado, nunca dejar tokens vivos.
- Un fallo del commit tras el cierre exitoso (código consumido o rotado en la carrera) sobredesloguea, pero falla del lado seguro.
- Test nuevo en `usuarios.e2e-spec.ts`: se mockea el rechazo de `cerrarTodasDeUsuario` una vez, se verifica `500`, que el hash del código sigue guardado, que la cookie y la contraseña vieja siguen valiendo, y que el reintento con el mismo código completa la recuperación.

Cierre del review: los tres resultados de lente quedaron capturados en la autoridad nativa (`rart1_48ef65…`, `rart1_d1e126…`, `rart1_ad423b…`) y el refuter corrió y corroboró el CRITICAL (`R4-001: corroborated`), pero **no se pudo capturar**: `capture-refuter --agent opencode` responde `provider runtime "opencode" has no Go-owned role capture contract`, y `--execute --agent pi` falla con `read provider refuter result: open : no such file or directory`. El relay de OpenCode no captura porque el hook `execute.after` dispara en el dispatch (los subagentes son siempre background). El review queda sin cerrar por una limitación del transporte, no por el código; la sustancia del hallazgo ya está corregida y fijada con test.

### Forecast de entrega
Autoría estimada: ~1.200 líneas (backend ~350, tests backend ~350, frontend ~350, tests frontend ~200). Supera el umbral de ~400, pero no hay push ni PR autorizados: los commits quedan como work units revisables y la estrategia de PR encadenado se decide cuando el usuario autorice publicar.
