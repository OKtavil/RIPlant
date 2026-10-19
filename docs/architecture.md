# Arquitectura y ruta de aprendizaje

## Mapa

```text
frontend/ React + Vite
    ├── app/            composición y navegación de pantallas
    ├── features/
    │   ├── lapidas/    modelo, API y UI del cementerio
    │   └── categorias/ modelo, API y UI del CRUD
    └── shared/api/     cliente HTTP común
    │ HTTP/JSON + CORS
backend/ NestJS
    ├── lapidas/      dominio, DTO, esquema Mongoose, servicio y controlador
    ├── categorias/   dominio, DTO, esquema Mongoose, servicio y controlador
    ├── usuarios/     cuenta, rol y hash bcrypt; siembra del administrador
    ├── sesiones/     sesión server-side, cookie httpOnly y middlewares
    ├── app.module    conexión MongoDB y resolución global de sesión
    └── shared/       validación global
```

El frontend conoce contratos JSON, no detalles internos de NestJS. Los controladores
traducen HTTP a llamadas de servicio; los servicios contienen las reglas y los modelos
Mongoose persisten los documentos. Los ids numéricos del dominio se mantienen aunque
MongoDB conserve internamente su `_id`, para no romper el contrato inicial del frontend.

El frontend sigue scream architecture: cada feature se reconoce por su capacidad de
negocio (`lapidas` y `categorias`) y contiene su modelo, acceso a datos y componentes de
interfaz. `App.tsx` solo compone esas features y coordina la navegación; el cliente HTTP
es una dependencia compartida, no una responsabilidad de las pantallas. No hay datos de
demostración ni persistencia local como segundo adaptador: si la API falla, la interfaz
informa el error y no presenta cambios como si estuvieran guardados.

## Persistencia MongoDB

El backend se conecta a `MONGODB_URI` y crea cuatro colecciones: `lapidas`,
`categorias`, `usuarios` y `sesiones`. Los índices únicos protegen los ids numéricos y
los `username`; los servicios insertan datos semilla solo cuando la colección está
vacía. El contador de coronas usa `$inc`, una operación atómica. La colección `sesiones`
tiene un índice TTL sobre `expiraEn`, así Mongo borra las sesiones vencidas solo.

## Sesiones y autorización

La sesión vive en el servidor, no en el token. `POST /sesiones` valida el usuario
contra su hash bcrypt, genera 32 bytes aleatorios y guarda **solo el SHA-256** de ese
token; la cookie `riplanta_sesion` lleva el token en claro, con `HttpOnly` y
`SameSite=Lax`. Cerrar sesión borra el documento, y la cookie vieja deja de valer: eso
es lo que un JWT stateless no puede hacer sin una lista negra.

La autenticación y la autorización son dos capas distintas:

1. `SesionesMiddleware` (global, desde `AppModule`) resuelve la cookie y adjunta
   `req.sesion`, o la deja `undefined`. No rechaza nada: solo dice quién es.
2. `AdminMiddleware` (desde `CategoriasModule`, solo en `POST`/`PUT`/`DELETE` de
   categorías) exige sesión (`401`) y rol `admin` (`403`).

Nest monta los middlewares ordenados por distancia del módulo, con la raíz primero:
cuando corre `AdminMiddleware`, `req.sesion` ya está resuelto. Los e2e de sesiones
prueban ese orden de verdad, no lo asumen.

## Próxima secuencia recomendada

1. Extraer interfaces de repositorio (`LapidasRepository`, `CategoriasRepository`).
2. Añadir usuario autenticado y hacer la corona idempotente por `(usuarioId, lapidaId)`.
3. Añadir límite de intentos de login y pantalla de login en React.
4. Añadir pruebas de integración contra MongoDB en Docker CI.

## Principios de mantenimiento

- El vocabulario del dominio permanece en español: `lapida`, `categoria`, `corona`.
- Los mensajes de UI se deciden en React; el backend devuelve códigos HTTP y detalles
  técnicos para desarrollo.
- No se introducen abstracciones antes de que exista un segundo adaptador real.
