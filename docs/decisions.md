# Registro de decisiones

## D-001 — MongoDB como persistencia de la entrega

**Decisión:** usar MongoDB 7 mediante Docker y Mongoose, con `MONGODB_URI` configurable.

**Análisis:** MongoDB era el destino del modelo de datos original y Docker ya estaba
preparado para el puerto `27018`. Mongoose hace visible el esquema, los índices y la
conversión entre documentos y el dominio sin introducir un ORM relacional.

**Consecuencia:** el backend necesita MongoDB para el modo real. La interfaz no tiene
modo demostración: si la API falla, informa el error (ver D-007).

## D-006 — IDs numéricos del dominio

**Decisión:** conservar `id: number` como campo explícito además del `_id` de MongoDB.

**Análisis:** el contrato existente, DTOs y frontend ya usan números. Exponer ObjectId
obligaría a una migración innecesaria antes de resolver autenticación y repositorios.
Los índices únicos sobre `id` mantienen la seguridad básica del identificador.

## D-002 — Validación en el borde

**Decisión:** usar DTOs y un `ValidationPipe` global con `whitelist` y
`forbidNonWhitelisted`.

**Análisis:** el controlador recibe datos no confiables; validar antes del servicio
mantiene las reglas fuera de la UI y evita que un cliente alternativo salte las
restricciones.

## D-003 — Estado optimista controlado en React

**Decisión:** la interfaz actualiza inmediatamente la experiencia y, si la API no está
disponible, informa el error en lugar de conservar un estado que parece guardado.

**Análisis:** la siguiente iteración debe distinguir mejor errores de red de errores de
negocio y sincronizar con una consulta posterior. El modo demostración que preveía esta
decisión queda descartado por D-007.

## D-004 — Una categoría por lápida en la UI inicial

**Decisión:** el formulario selecciona una categoría mediante `categoriaId`.

**Análisis:** el esquema original contempla varias categorías, pero una selección hace
el primer flujo más claro y evita diseñar una interacción que todavía no necesita el
usuario. El modelo puede evolucionar a `categoriaIds` cuando exista un caso real.

## D-005 — SDD + ODD para el trabajo

**Decisión:** cada cambio debe tener un contrato observable y un resultado de usuario.

**Análisis:** SDD reduce ambigüedad técnica; ODD evita completar endpoints que no
resuelven una capacidad visible. Juntos mantienen el proyecto pequeño, enseñable y
verificable.

## D-007 — Sin datos de demostración en la interfaz

**Decisión:** la interfaz no incluye datos de demostración ni persistencia local: si la
API no está disponible, informa el error. Los datos simulados se reservan para los mocks
de las pruebas.

**Análisis:** un modo demostración oculta fallos reales de red y presenta cambios como
si estuvieran guardados cuando no lo están. `App.tsx` ya informa el error sin datos de
demostración; el mock pertenece al entorno de pruebas, no al producto.

**Consecuencia:** invalida el modo demostración previsto en D-003 y la frase equivalente
de la consecuencia de D-001.

## D-008 — Usuario Zombie en lugar de purgar las lápidas sin dueño

**Decisión:** las lápidas que llegan sin dueño no se eliminan. Se transfieren a un usuario
reservado `zombie` (rol `zombie`) al arrancar, el frontend las muestra marcadas como
distintas, y `GET /lapidas/asesinos` lo excluye del ranking.

**Análisis:** una purga (`deleteMany` de todo lo sin `usuarioId`) es irreversible, borra
contenido que un usuario escribió de verdad y deja la pantalla vacía sin que nadie decida
eso. Transferir al zombie conserva el dato, lo hace visible y convierte un caso borde en
estado de dominio con nombre propio — el cementerio ya hablaba de muertos que vuelven.
Además obliga a modelar un rol que no autoriza nada, que es la prueba de que la
autorización y la identidad son capas distintas.

**Consecuencia:** el usuario `zombie` queda reservado (`400` en el registro, no `409`) y su
contraseña es intratable, así que nadie puede iniciar sesión como él. El estado sale de
`duenio.rol` en la respuesta de la API: si lo resolviera el frontend comparando usernames
se repetiría el mismo error frágil que ya existe en `autor`.
