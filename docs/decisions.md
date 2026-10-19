# Registro de decisiones

## D-001 — MongoDB como persistencia de la entrega

**Decisión:** usar MongoDB 7 mediante Docker y Mongoose, con `MONGODB_URI` configurable.

**Análisis:** MongoDB era el destino del modelo de datos original y Docker ya estaba
preparado para el puerto `27018`. Mongoose hace visible el esquema, los índices y la
conversión entre documentos y el dominio sin introducir un ORM relacional.

**Consecuencia:** el backend necesita MongoDB para el modo real. El modo demostración
del frontend sigue permitiendo explorar la UI sin servicios.

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

**Decisión:** la interfaz actualiza inmediatamente la experiencia y conserva un modo
demostración cuando la API no está disponible.

**Análisis:** permite explorar el prototipo sin levantar servicios, que es valioso en
una ruta de aprendizaje. Las acciones de API siguen intentando persistir cuando el
backend está disponible; la siguiente iteración debe distinguir mejor errores de red
de errores de negocio y sincronizar con una consulta posterior.

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
