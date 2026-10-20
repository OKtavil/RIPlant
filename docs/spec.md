# Especificación funcional

## Resultado del producto

Una persona puede crear una cuenta, entrar al cementerio, explorar lápidas, publicar
un homenaje con su foto, comentarlo, dar una corona y consultar rankings. Una persona
administradora puede organizar categorías y moderar los comentarios.

## Contratos del backend

La columna **Acceso** dice quién puede llamar cada ruta; la columna **Resultado**, qué
devuelve. `401` es *sin sesión*, `403` es *con sesión pero sin permiso*, `404` es
*recurso inexistente*, `409` es *conflicto con algo ya existente* y `400` es *payload
inválido*.

| Método | Ruta | Acceso | Resultado |
|---|---|---|---|
| GET | `/lapidas` | público | Lista de lápidas, cada una con `duenio: { username, rol }` |
| GET | `/lapidas/:id` | público | Detalle con `duenio`, o `404` |
| GET | `/lapidas/asesinos` | público | `[{ username, muertes }]` de mayor a menor, top 10; excluye al usuario `zombie` |
| POST | `/lapidas` | sesión (cualquier rol) | Crea una lápida (`201`) o `400` por payload inválido. `usuarioId` y `autor` salen de la sesión; el cuerpo no los decide |
| PUT | `/lapidas/:id` | dueño o `admin` | Actualiza una lápida o `404`; `403` si es de otro |
| DELETE | `/lapidas/:id` | dueño o `admin` | Elimina la lápida (`200`), `404` o `403`; borra en cascada sus comentarios, coronas y foto |
| POST | `/lapidas/:id/corona` | sesión (cualquier rol) | Da corona (`201` si la creó, `200` si ya estaba) o `404`. **Idempotente**: la segunda corona del mismo usuario no es un error. Agrega `coronadaPorMi` a la respuesta |
| DELETE | `/lapidas/:id/corona` | sesión (cualquier rol) | Quita la corona de **este** usuario (`200`, o `404`). **Idempotente**: si no la tenía, no baja el contador. Agrega `coronadaPorMi: false`. Cada usuario solo puede quitar la suya |
| POST | `/lapidas/:id/foto` | dueño o `admin` | Sube la foto (multipart, campo `foto`); `201`, o `400` sin archivo, `404`, `403`, `413` si supera 5 MB, `415` si no es JPEG, PNG o WebP |
| GET | `/lapidas/:id/comentarios` | público | Comentarios de la lápida, por fecha ascendente; `404` si la lápida no existe |
| POST | `/lapidas/:id/comentarios` | sesión (cualquier rol) | Crea un comentario (`201`); `400` si `texto` falta o supera 500 caracteres, `404` si la lápida no existe. `autor` y `usuarioId` salen de la sesión |
| DELETE | `/comentarios/:id` | solo `admin` | Elimina el comentario (`200`) o `404`. El autor no borra el suyo |
| POST | `/usuarios` | público | Crea una cuenta (`201`), `400` si el nombre es inválido o reservado, `409` si ya está en uso. Devuelve la misma cookie httpOnly que el login |
| GET | `/categorias` | público | Lista categorías |
| POST | `/categorias` | solo `admin` | Crea una categoría validada; sin sesión `401`, con rol `usuario` `403` |
| PUT | `/categorias/:id` | solo `admin` | Renombra una categoría o `404` |
| DELETE | `/categorias/:id` | solo `admin` | Elimina una categoría o `404` |
| POST | `/sesiones` | público | Inicia sesión o `401`; entrega una cookie httpOnly. Tras 5 fallos del mismo origen responde `429` |
| GET | `/sesiones/actual` | sesión | Sesión vigente o `401` |
| DELETE | `/sesiones` | sesión | Cierra la sesión (`204`) |

### Propiedad de la lápida

Cada lápida pertenece a un usuario (`usuarioId`, obligatorio). **No hay lápidas sin
dueño**: las que aparecen huérfanas en la base se le entregan al usuario reservado
`zombie` al arrancar, en una migración idempotente. El `zombie` tiene `rol: 'zombie'`,
no puede iniciar sesión y no autoriza nada; el front lo distingue por `duenio.rol`.

Quién puede mutar una lápida:

- **Publicar** (`POST /lapidas`): cualquier persona con sesión. El autor y el dueño se
  toman de la sesión, nunca del cuerpo.
- **Editar y borrar** (`PUT`/`DELETE /lapidas/:id`) y **subir la foto**: su dueño, o
  cualquiera con rol `admin`.
- Si se borrara un usuario, se borrarían sus lápidas con todo lo suyo. El borrado de
  usuarios todavía no existe: queda como la política a implementar.

### Foto de la planta

`POST /lapidas/:id/foto` es la **única** vía para cargar la foto. El JSON de
crear/editar ignora `fotoUrl`. El servidor decide el nombre del archivo
(`randomUUID()` más la extensión del tipo detectado) y valida el tipo por **magic
bytes**, no por el `mimetype` ni la extensión que declara el cliente. Se guarda en
disco local y se sirve en `/uploads/<archivo>`.

## Criterios de aceptación

- Un payload desconocido se rechaza; no se filtran propiedades silenciosamente.
- Una lápida exige nombre, epitafio, fecha ISO válida y categoría. La causa de muerte
  es **opcional**.
- Una categoría tiene entre 3 y 20 caracteres y no puede ser solo espacios.
- Las mutaciones de categorías sin sesión devuelven `401`; con rol `usuario`, `403`;
  con rol `admin`, se ejecutan. `GET /categorias` sigue siendo público.
- Una sesión se entrega en una cookie `HttpOnly` y `SameSite=Lax`; el token en claro
  nunca se guarda en la base (solo su SHA-256) y el `passwordHash` nunca sale en una
  respuesta.
- Cerrar sesión invalida el token en el servidor: reenviar la misma cookie devuelve `401`.
- Una sesión vencida no se acepta aunque el índice TTL todavía no la haya borrado.
- El login frena la fuerza bruta: tras cinco fallos del mismo origen (IP + usuario) en
  quince minutos responde `429` sin gastar otra comparación bcrypt, y un tope global de
  comparaciones simultáneas evita que un flood sature el event loop.
- Crear una cuenta pide `{ username, password }` y nada más: no hay email (D1) y el rol
  siempre es `usuario`, aunque el cuerpo intente mandar otro. La contraseña tiene un
  mínimo de **8 caracteres**. El nombre `admin` y el nombre `zombie` están reservados y
  devuelven `400`; un nombre ya registrado, `409`. Al crearla, la sesión queda iniciada.
- Editar o borrar una lápida sin sesión devuelve `401`; con la sesión de otra persona y
  sin rol `admin`, `403`. Igual para subir la foto.
- Una corona exige sesión y solo se puede dar una vez por usuario y lápida. **No es un
  error repetir**: `POST` es idempotente (`201` la primera vez, `200` después) y `DELETE`
  también, así que el frontend alterna poner y quitar con un click sin que un doble click
  o un reintento deje el estado al revés. La restricción la garantiza un índice único en
  la colección `coronas`, no una consulta previa; el arranque espera a que ese índice
  exista antes de aceptar escrituras. Las respuestas traen `coronadaPorMi`, que es lo que
  el frontend necesita para saber qué pintar. Nadie puede quitar la corona de otro: el
  borrado filtra por `usuarioId`.
- Un comentario exige sesión, un `texto` de hasta 500 caracteres, y lo borra solo un
  `admin`: sin sesión, `401`; con rol `usuario`, `403`.
- La foto se guarda con un nombre generado por el servidor y validada por magic bytes;
  un archivo que no es JPEG, PNG ni WebP devuelve `415` y uno de más de 5 MB, `413`.
  Al reemplazarla se borra la anterior, y al borrar la lápida se borra la suya.
- `GET /lapidas/asesinos` agrupa por dueño, ordena de mayor a menor y excluye al
  usuario `zombie`.
- El frontend muestra estados útiles: aviso de error si la API no está disponible (sin
  datos de demostración; los mocks se reservan para las pruebas), confirmación después
  de publicar y confirmación antes de eliminar categorías.
- La **tarjeta** de la grilla muestra el epitafio además de la foto, el nombre, la
  categoría con la causa, el autor y las coronas. Aplica en el cementerio (Inicio), en
  el perfil y en las filas del ranking.
- La **página de cada lápida** tiene el panel de madera como contenedor: arriba la
  foto, después una card con los detalles del texto (nombre, autor, epitafio y datos de
  categoría, causa y fecha) y al final las acciones. La card no incluye ni la foto ni los
  botones. La columna derecha queda solo para los comentarios.
- Las pruebas cubren el camino feliz y los errores HTTP principales.
- La **barra de navegación** lleva el logo (sin fondo propio, se ve el café del nav) y,
  a la derecha, el menú con las acciones de sesión: `INICIAR SESIÓN` sin sesión,
  y `@usuario` con `SALIR` cuando hay una. El prototipo no traía esas acciones.
- Los **comentarios** del detalle se leen y se escriben contra la API real
  (`GET`/`POST /lapidas/:id/comentarios`). La lista es pública; el formulario
  solo aparece con sesión y sin ella se invita a entrar. **Borrar un comentario
  todavía no está en la UI**: el backend lo permite solo a `admin`, y el autor
  no puede borrar el suyo.

## Casos de uso ODD

| Resultado observable | Flujo |
|---|---|
| Unirse al jardín | Crear cuenta → (auto-login) → cementerio |
| Recordar una planta | Cementerio → tarjeta → detalle |
| Participar en el homenaje | Tarjeta/detalle → Dar corona |
| Crear un registro | Publicar → completar formulario → subir foto → ver tarjeta en cementerio |
| Conversar en el detalle | Detalle → comentar (con sesión) |
| Moderar | Detalle → eliminar comentario (solo `admin`) |
| Mantener el vocabulario | Categorías → agregar, editar o eliminar |
| Descubrir popularidad | Rankings → ordenar por coronas o por asesinos seriales |
