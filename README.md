# R.I.Planta 🪦🌱

Red social retro donde la gente publica **lápidas** para las plantas que no sobrevivieron: un cementerio de plantas con humor. Es un **proyecto de práctica** para aprender el stack web moderno (sobre todo **NestJS**) y arquitectura de software de forma aplicada. El producto es simple a propósito: el foco está en los conceptos, no en las funciones.

🎨 [Prototipo de diseño](https://claude.ai/artifact/9VPqJgLvSnqa3pyiaxUiBE) (5 pantallas, estilo retro pixelado; falta diseñar la pantalla de categorías)

## Estado actual

- ✅ Prototipo de diseño (5 pantallas)
- ✅ Esquema de datos original (relacional) y su traducción a MongoDB (propuesta)
- ✅ Frontend funcional en React: cementerio, rankings, publicación, detalle, perfil y categorías
- ✅ Backend funcional en NestJS con API para lápidas y categorías
- ✅ Persistencia en MongoDB con Mongoose, Docker, semillas e índices
- ✅ Sesiones con cookie httpOnly y CRUD de categorías protegido para administradores
- ✅ Registro de cuentas con auto-login, comentarios, foto de la planta en disco local,
  ranking de asesinos seriales y propiedad de la lápida (cada usuario borra la suya; el
  `admin` puede con todas)

La entrega actual prioriza tener un producto navegable de extremo a extremo. El backend
necesita MongoDB para arrancar (ver [Cómo correrlo](#cómo-correrlo)). La API de sesiones
ya está conectada al frontend: iniciar sesión, recuperar la sesión vigente y cerrarla
funcionan de extremo a extremo.

Queda pendiente **recuperar / restablecer contraseña**, que necesita un proveedor de
email (ver [Recuperar contraseña](#recuperar-contraseña-pendiente)).

## Documentación de la entrega

- [Especificación funcional y criterios de aceptación](./docs/spec.md)
- [Arquitectura y ruta de aprendizaje](./docs/architecture.md)
- [Registro de decisiones](./docs/decisions.md)
- [Cómo leer la documentación](./docs/README.md)

## Idea del producto

| Concepto de la app | Equivale a |
|--------------------|------------|
| Lápida | Post (nombre de la planta, epitafio, fechas, categoría) |
| Corona | Voto / "me gusta" |
| Cementerio | Feed de todas las lápidas |
| Salón del Honor | Ranking de lápidas por coronas recibidas |
| Asesinos Seriales | Ranking de usuarios por lápidas publicadas |
| Superviviente Zombie | Insignia: se otorga cuando una lápida reportada como muerta vuelve a mostrar señales de vida |

## Pantallas

1. **Inicio**: cuadrícula "Cementerio de plantas" y barra lateral con Salón del Honor y Asesinos Seriales (top 3).
2. **Ranking**: Salón del Honor (por coronas) y Asesinos Seriales (por lápidas publicadas).
3. **Publicar**: foto, nombre de la planta, categoría (se elige de la colección de categorías), fecha de fallecimiento y epitafio.
4. **Detalle de lápida**: epitafio, autor, categoría, causa de muerte, fecha, *Dar corona* y comentarios.
5. **Perfil**: estadísticas (plantas asesinadas, coronas recibidas), insignias y "su cementerio".
6. **Categorías (CRUD)**: listar, crear, editar y eliminar categorías. Solo para administradores. *Pendiente de diseñar en el prototipo.*
7. **Autenticación**: pantallas de iniciar sesión, crear cuenta, recuperar contraseña y establecer una nueva contraseña. *Iniciar sesión y crear cuenta están implementados; recuperar/restablecer contraseña queda pendiente de endpoints en el backend.*

### Pantallas de autenticación

Estas pantallas definen el flujo visual y funcional del acceso a R.I.Planta. Iniciar
sesión y crear cuenta ya están implementados contra la API; recuperar contraseña y
establecer una nueva contraseña existen como pantallas con sus campos deshabilitados,
a la espera de que el backend exponga esos endpoints.

#### 1. Iniciar sesión

Pantalla de entrada para usuarios que ya tienen una cuenta.

- **Encabezado:** logotipo `R.I.PLANTA` y texto breve: "Vuelve a tu jardín memorial".
- **Campos:**
  - `Nombre de usuario` — obligatorio; es el mismo que valida `POST /sesiones`.
  - `Contraseña` — obligatoria, oculta por defecto y con control para mostrar u ocultar.
- **Acciones:**
  - `Entrar` — valida los campos y envía las credenciales.
  - `¿Olvidaste tu contraseña?` — lleva a Recuperar contraseña.
  - `Crear una cuenta` — lleva a Crear cuenta.
- **Estados:** formulario inicial, validación de campos, credenciales incorrectas,
  usuario bloqueado o deshabilitado, error temporal del servidor y envío en progreso.
- **Éxito:** redirige al Cementerio y conserva la sesión del usuario.

#### 2. Crear cuenta

Pantalla para registrar un nuevo jardinero. **Implementada** contra `POST /usuarios`.

- **Encabezado:** `Únete al jardín memorial`.
- **Campos:**
  - `Nombre de usuario` — obligatorio y único; máximo 50 caracteres. `admin` y `zombie`
    están reservados.
  - `Contraseña` — obligatoria, mínimo 8 caracteres, con los requisitos visibles antes
    de enviar.
  - `Confirmar contraseña` — debe coincidir con la contraseña.
- **Acciones:**
  - `Crear cuenta` — valida y registra al usuario.
  - `Ya tengo una cuenta` — vuelve a Iniciar sesión.
- **Estados:** validación por campo, nombre de usuario ya registrado (`409`), contraseñas
  diferentes, error temporal del servidor y envío en progreso.
- **Éxito:** la cuenta queda creada **y la sesión iniciada** —el backend devuelve la misma
  cookie httpOnly que el login—, así que lleva directo al Cementerio.

> **Sin correo electrónico.** El registro pide solo `username` y `password` (decisión D1).
> El campo `Correo electrónico` que figuraba en el prototipo no se implementó: queda para
> cuando se agregue la recuperación de contraseña.

#### 3. Recuperar contraseña (pendiente)

Pantalla para solicitar un enlace de recuperación sin revelar si la cuenta existe.
**Sin backend todavía**: necesita un proveedor de email y el campo `email` en `usuarios`,
que hoy no existen.

- **Encabezado:** `Recupera el acceso a tu jardín`.
- **Campo:** `Correo electrónico` — obligatorio, con formato válido.
- **Acciones:**
  - `Enviar enlace` — solicita el correo de recuperación.
  - `Volver a iniciar sesión` — regresa a Iniciar sesión.
- **Estados:** validación del correo, envío en progreso y error temporal del servidor.
- **Éxito:** muestra siempre un mensaje neutro: "Si existe una cuenta con ese correo,
  recibirás instrucciones para recuperar el acceso".

#### 4. Establecer nueva contraseña (pendiente)

Pantalla abierta desde el enlace de recuperación. Sin backend todavía, por lo mismo que
la anterior.

- **Encabezado:** `Elige una nueva contraseña`.
- **Campos:**
  - `Nueva contraseña` — obligatoria, con los requisitos visibles.
  - `Confirmar contraseña` — debe coincidir con la nueva contraseña.
- **Acción:** `Guardar nueva contraseña`.
- **Estados:** enlace inválido o expirado, contraseñas diferentes, validación por campo,
  envío en progreso y error temporal del servidor.
- **Éxito:** confirma el cambio y redirige a Iniciar sesión.

#### Navegación y criterios comunes

- Las pantallas mantienen el estilo retro pixelado del resto del producto y son
  utilizables en móvil y escritorio.
- Los mensajes de validación se muestran junto al campo correspondiente, en español, sin
  borrar los valores que el usuario ya escribió.
- El botón principal queda deshabilitado durante el envío para evitar solicitudes
  duplicadas.
- Ninguna pantalla muestra contraseñas en texto claro ni datos sensibles en mensajes de
  error.
- El usuario autenticado puede cerrar sesión desde su menú de perfil.
- Las pantallas de autenticación no muestran datos de demostración ni permiten continuar
  como invitado: si el acceso falla, se conserva la pantalla y se informa el error.

## Base de datos: MongoDB

Se decidió **MongoDB**. El esquema original estaba pensado para una base relacional (tablas y claves foráneas), así que hay que traducirlo. La regla general en Mongo: **se incrusta lo que siempre se lee junto y es pequeño; se referencia (con un id) lo que crece sin límite o se consulta por separado.**

### Del esquema relacional a colecciones (propuesta)

| Tabla original | En MongoDB | Por qué |
|----------------|------------|---------|
| `usuarios` | Colección `usuarios` | Entidad principal, se consulta por sí sola |
| `lapidas` | Colección `lapidas` | Entidad principal |
| `jardinero_has_lapidas` | Campo `autorId` dentro de `lapidas` | Era una tabla puente solo para saber quién publicó. Con una referencia basta |
| `categorias` | Colección `categorias` | Se administran desde una pantalla de CRUD, así que son datos editables |
| `lapidas_has_categorias` | Campo `categoriaIds` (lista de ids) dentro de `lapidas` | Era solo una tabla puente; una lista de referencias la reemplaza |
| `coronas_votos` | Colección `coronas` | Puede crecer mucho, así que no se incrusta |
| `comentarios` | Colección `comentarios` | También crece sin límite |

### Forma de los documentos (propuesta)

```ts
// usuarios
{
  _id, nombre, apellido,
  username,          // índice único
  email,             // índice único — previsto, aún sin implementar (D1)
  passwordHash,      // hash de bcrypt, nunca la contraseña en claro
  rol,               // 'usuario' | 'admin' | 'zombie' (antes era un bit)
  plantasAsesinadas, // contador, ver nota abajo
  creadoEn
}

// lapidas
{
  _id, nombrePlanta, epitafio,
  fechaFallecimiento, fechaPublicacion,
  autor,             // username denormalizado al publicar
  usuarioId,         // referencia a usuarios._id — obligatorio
  categoriaId,       // referencia a categorias._id
  causaMuerte,       // opcional
  fotoUrl,           // la escribe solo POST /lapidas/:id/foto
  coronasCount       // contador, ver nota abajo
}

// categorias
{ _id, id, nombre }   // nombre: índice único, máximo 20 caracteres

// coronas
{ _id, lapidaId, usuarioId, creadaEn }   // índice único (lapidaId, usuarioId)

// comentarios
{ _id, lapidaId, usuarioId, autor, texto, creadoEn }
```

**Por qué así**

- **Una corona por usuario y lápida**: en SQL lo garantizaba la clave primaria compuesta. En Mongo lo garantiza un **índice único** sobre `(lapidaId, usuarioId)`. Sin ese índice, dos peticiones simultáneas podrían crear dos coronas.
- **Contadores (`coronasCount`, `plantasAsesinadas`)**: los rankings se muestran en casi todas las pantallas. Calcularlos con `COUNT` o agregaciones en cada visita es caro; guardar el número y actualizarlo con `$inc` (operación atómica) es rápido. El costo es que hay que mantenerlos sincronizados al dar o quitar una corona o publicar una lápida. Nota: `coronasCount` de las lápidas sembradas es denormalizado y **no** tiene documentos en `coronas` que lo justifiquen; las coronas previas a esta función no tienen autor registrado y no se reconstruye.
- **`usuarioId` obligatorio y `autor` denormalizado**: la lápida necesita saber quién la puede borrar, y eso no se puede resolver comparando strings de `autor`. El `autor` queda como texto de pantalla; la **fuente de verdad** para permisos y rankings es `usuarioId`.
- **`passwordHash`**: el hash de bcrypt se guarda completo. El campo original `password varchar(60)` apuntaba a lo mismo.
- **Categorías por referencia (no por nombre)**: como se pueden renombrar desde el CRUD, la lápida guarda el **id** de la categoría. Si guardara el nombre, renombrar una categoría obligaría a actualizar todas las lápidas que la usan. Con el id, el nombre vive en un solo lugar.
- **`email`**: figura en el esquema pero **no se pide en el registro** (D1). Se agrega cuando se implemente la recuperación de contraseña, junto con la migración de los usuarios que ya existen.

<details>
<summary>Esquema relacional original (referencia)</summary>

```dbml
Table usuarios {
  id int [pk, increment]
  nombre varchar(50) [not null]
  apellido varchar(30) [not null]
  username varchar(15) [not null, unique]
  password varchar(60) [not null]
  email varchar(50) [not null, unique]
  rol bit [not null]
  plantas_asesinadas int [not null, default: 0]
}

Table lapidas {
  id int [pk, increment]
  nombre_planta varchar(40) [not null]
  epitafio mediumtext [not null]
  fecha_fallecimiento datetime
  fecha_publicacion datetime
}

Table categorias {
  id int [pk, increment]
  nombre varchar(20) [not null]
}

Table comentarios {
  id int [pk, increment]
  post_id int [not null]
  user_id int [not null]
  comentario longtext [not null]
}

Table jardinero_has_lapidas {
  user_id int [not null]
  post_id int [not null]
  indexes { (user_id, post_id) [pk] }
}

Table coronas_votos {
  user_id int [not null]
  post_id int [not null]
  fecha datetime
  indexes { (user_id, post_id) [pk] }
}

Table lapidas_has_categorias {
  post_id int [not null]
  category_id int [not null]
  indexes { (post_id, category_id) [pk] }
}

Ref: comentarios.user_id > usuarios.id
Ref: comentarios.post_id > lapidas.id
Ref: jardinero_has_lapidas.user_id > usuarios.id
Ref: jardinero_has_lapidas.post_id > lapidas.id
Ref: coronas_votos.user_id > usuarios.id
Ref: coronas_votos.post_id > lapidas.id
Ref: lapidas_has_categorias.post_id > lapidas.id
Ref: lapidas_has_categorias.category_id > categorias.id
```

</details>

## Convenciones de idioma y vocabulario

**Decisión:** no hay un idioma único para el proyecto. Hay un criterio por cada capa,
según quién la lee. Aplican al código, a los datos, a la interfaz y a la documentación.

### 1. El vocabulario del dominio va en el idioma del dominio, y la misma palabra en todas las capas

Quien nombra la cosa es el negocio, no el lector.

`categoria`, `lapida`, `epitafio`, `corona`, `plantasAsesinadas` van en español, y van
iguales en el identificador del código, en el nombre de la colección, en la clave del
JSON y en la etiqueta de la pantalla.

La razón no es estética: **cada traducción entre capas es una oportunidad de producir
`undefined` sin darse cuenta.** Si el DTO llama `nombre` y Mongo guarda `name`, hace
falta una capa de mapeo y hay que acordarse de escribirla. Con una sola palabra en las
cuatro capas, no hay capa que olvidar.

Es lo que en Domain-Driven Design se denomina **Ubiquitous Language**: el vocabulario del
negocio debe ser idéntico en la conversación, en el código, en los datos y en la
interfaz.

### 2. La copia que ve el usuario la escribe el frontend

**Decisión: los mensajes de la interfaz los traduce React, no el backend.**

El backend responde con un código de estado y un mensaje técnico. La pantalla mapea esa
respuesta a texto en español y decide dónde y cómo mostrarlo. Esto evita depender de
mensajes que genera el framework o de terceros para la experiencia de usuario.

Consecuencias:

- Los mensajes que produce el framework (`"property rol should not exist"`,
  `Internal server error`, `404`, `405`) están bien en inglés: son texto técnico y no
  llegan a una pantalla.
- Los `message:` de `CreateCategoriaDTO` dejan de ser copia de usuario y pasan a ser
  ayuda de desarrollo (Postman, logs, respuesta de `curl`). Se mantienen en español
  porque el único que los lee habla español.
- **Pendiente:** la respuesta de validación de hoy es solo una lista de frases, sin el
  campo: `{"message":["El nombre de la categoría es obligatorio"],"statusCode":400}`.
  Sin el campo, la interfaz no sabe qué input resaltar y tendría que adivinarlo
  comparando el texto. Para que el frontend sea dueño de la copia necesita un error
  **estructurado** (campo + código de validación) en lugar de una frase; eso se
  consigue con un `exceptionFactory` en el `ValidationPipe`. → `TODO.md`, deuda 10.

### 3. Los nombres que no se inventan van en inglés; los mensajes propios, en español

En inglés todo lo que definen el framework, la librería o el estándar: `findAll`,
`create`, `@Injectable()`, `Service`, `DTO`, `beforeEach`, `describe`/`it`,
Conventional Commits, `README`. Nombrarlo distinto no aporta y resta: hay menos
documentación disponible, menos resultados de búsqueda y más fricción al leer un stack
trace.

En español los mensajes que se redactan en este proyecto, porque el único que los lee es
el desarrollador y habla español.

### 4. Lo que impone la herramienta no se traduce

`_id`, `email`, `username`, `passwordHash`, `createdAt`, `@Injectable()`, `README.md`,
`TODO.md`. Son artefactos de infraestructura, no del dominio.

### Por qué no todo en inglés

Si el dominio estuviera en inglés, correspondería. No lo está, y traducirlo casta
significado:

- **`corona`** es una ofrenda floral fúnebre. En inglés sería `crown` o `wreath`: la
  primera es incorrecta y la segunda ya no conecta con la palabra que usan el visitante
  y el propio dueño del proyecto.
- **`plantasAsesinadas`** es un concepto con la voz propia del proyecto. `killedPlants`
  o `murderedPlants` son traducciones que esa voz pierden.

El argumento a favor de escribir todo en inglés es de escala: equipos con idiomas
distintos que quieren reducir la fricción entre ellos. Ese argumento no aplica a un
proyecto cuyo dominio y cuya interfaz están en español.

### Glosario

Una fila equivale a una palabra en todas las columnas. Si una columna cambia, debe ser
una decisión y no un descuido. Revisar estas filas en un PR no tiene costo y detecta un
`name` donde debería haber `nombre`, que es justamente un fallo que `build`, `lint` ni
`test` identifican.

| Concepto del negocio | Identificador en código | Colección | Claves donde aparece en JSON | Etiqueta en UI |
|---|---|---|---|---|
| Categoría | `Categoria` | `categorias` | `nombre` (en `categorias`), `categoriaIds` (en `lapidas`) | "Categoría" |
| Lápida | `Lapida` | `lapidas` | `epitafio`, `fechaFallecimiento`, `causaMuerte` | "Lápida" |
| Corona (ofrenda) | `Corona` | `coronas` | `coronasCount` (en `lapidas`) | "Corona" |
| Comentario | `Comentario` | `comentarios` | `comentario` | "Comentario" |
| Usuario | `Usuario` | `usuarios` | `plantasAsesinadas`, `rol` | "Usuario" |

**Este glosario vive al lado de la propuesta de esquema, no en otro documento.** Son el
mismo concepto descrito dos veces; si se separan en ficheros distintos se desincronizan,
y esa desincronización es exactamente el fallo que previene. Completa la tabla de
**Idea del producto**, que explica *qué es* cada concepto; esta explica *cómo se
escribe* en cada capa.

### Dónde aplica cada regla

| Dónde | Idioma | Regla |
|---|---|---|
| Claves JSON, colecciones, identificadores de dominio | Español | 1 |
| Copia de pantalla | Español, escrita en el frontend | 2 |
| `message:` de los DTO, logs, excepciones internas | Español | 3 |
| Funciones, decoradores, estructuras de test, ficheros | Inglés | 3 y 4 |
| Commits | Conventional Commits en inglés, scope en español | 3 |
| Nombres de `describe`/`it` | `should ...` en inglés con el término de dominio en español | 3 |
| Documentación (`README.md`, `TODO.md`) | Español | — |

## Revisión: decisiones abiertas

Al comparar el esquema con el prototipo, estos puntos siguen sin decidir:

| # | Tema | Situación |
|---|------|-----------|
| 1 | **Foto de la planta** | ✅ **Resuelto**: disco local bajo `backend/var/uploads/`, servida en `/uploads/`, cargada por `POST /lapidas/:id/foto`. |
| 2 | **Causa de muerte** | ✅ **Resuelto**: es opcional. El formulario de Publicar la pide pero ya no es obligatoria. |
| 3 | **Una o varias categorías** | El prototipo permite elegir **una**; el esquema original permitía **varias**. Implementado como una sola (`categoriaId`); pasarlo a varias tocaría el DTO, el schema y el front. |
| 4 | **Autoría** | ✅ **Resuelto**: un solo dueño por lápida (`usuarioId`), que es lo que muestra el prototipo. |
| 5 | **Insignia Zombie** | No existe en el esquema: faltan el estado "reportada como muerta" y una forma de guardar insignias (por ejemplo, una lista `insignias` en el usuario). **Ojo**: no confundir con el usuario reservado `zombie`, que es el dueño de las lápidas huérfanas. |
| 6 | **Fechas** | `fechaPublicacion` se asigna al crear. Los comentarios y las coronas llevan fecha (`creadoEn`). |
| 7 | **Rol** | ✅ **Resuelto**: texto, no bit. Hoy hay tres: `'usuario'`, `'admin'` y `'zombie'` (este último no autoriza nada). |
| 8 | **Borrar una categoría en uso** | Si hay lápidas que la usan, hay que decidir: impedir el borrado, o quitarla de esas lápidas. |
| 9 | **Quién administra categorías** | ✅ **Resuelto**: solo `admin`, implementado con `AdminMiddleware`. |
| 10 | **Recuperar contraseña** | Pendiente por decisión (D6): necesita un proveedor de email y el campo `email`, que el registro no pide. Al implementarlo hay que migrar los usuarios existentes. |
| 11 | **Borrado de usuarios** | No existe. La política ya está definida —se borran sus lápidas, comentarios, coronas, sesiones y fotos— pero falta implementarla. |
| 12 | **Correo electrónico** | Deshabilitado en el registro por decisión D1. El prototipo lo mostraba; el `POST /usuarios` no lo acepta. |

## Objetivos de aprendizaje

- Arquitectura **hexagonal** (puertos y adaptadores) y **scream architecture**
- Capa de aplicación, casos de uso e inyección de dependencias
- Comunicación entre casos de uso
- Autenticación y permisos de usuarios
- Enrutación y middlewares
- Tests automatizados
- Seeds y migraciones de base de datos
- Herramientas: Docker, pnpm (workspaces) y git worktrees

## Stack

| Capa | Tecnología |
|------|------------|
| Lenguaje | TypeScript |
| Frontend | React + Vite |
| Backend | NestJS |
| Base de datos | MongoDB |
| Gestor de paquetes | pnpm |
| Contenedores | Docker |

Backend y frontend van separados, pero dentro de **un solo repositorio (monolito)**.

## Fases

Son dos pasos grandes. La división en subfases es una propuesta para ir de lo básico a lo complejo; ajústala si la conversación original tenía otro orden.

### Paso 1: versión simple (sin arquitectura hexagonal)

Todo funcionando con la estructura típica de Nest. Sirve para sentir el problema que la hexagonal resuelve después.

| Fase | Qué se construye | Qué se aprende |
|------|------------------|----------------|
| 0. Entorno | Repo monolito con pnpm workspace, `docker-compose.yml` con MongoDB | pnpm, Docker, git worktrees |
| 1. Backend base | Módulos, controladores y servicios de Nest para lápidas y categorías (incluido el CRUD) | Enrutación, estructura de Nest, inyección de dependencias básica |
| 2. Persistencia | Conexión a Mongo, colecciones e índices (incluido el único de coronas), seeds con las 6 categorías iniciales y lápidas de ejemplo | Modelado de documentos, seeds, migraciones |
| 3. Usuarios y seguridad | Registro, login con hash de contraseña, rutas protegidas, rol admin/usuario; solo admin crea, edita o borra categorías | Autenticación, permisos, middlewares y guards |
| 4. Interacción | Dar corona, comentarios, rankings con contadores | `$inc` atómico, consultas ordenadas, regla de una corona por usuario |
| 5. Frontend | Las pantallas del prototipo y la de categorías en React + Vite, consumiendo la API | Vite, rutas del cliente, consumo de API |
| 6. Tests | Pruebas de endpoints y de lógica clave | Tests automatizados |

### Paso 2: refactor a arquitectura hexagonal

Mismo comportamiento, distinta estructura. Si los tests del paso 1 siguen pasando, el refactor salió bien.

- Separar **dominio** (reglas puras), **aplicación** (casos de uso) e **infraestructura** (Nest, MongoDB).
- Definir **puertos** (interfaces, por ejemplo `LapidaRepository`) y **adaptadores** (el repositorio que habla con Mongo) con inyección de dependencias.
- Hacer que los casos de uso se comuniquen entre sí sin acoplarse (por ejemplo, dar corona actualiza el ranking).
- Reorganizar carpetas con **scream architecture**.
- Probar el dominio **sin base de datos**.

## Estructura meta (scream architecture)

Las carpetas gritan **qué hace** la app, no con qué framework está hecha.

```
riplanta/
├─ backend/
│  └─ src/
│     ├─ lapidas/
│     │  ├─ domain/           # entidad Lápida y reglas puras
│     │  ├─ application/      # casos de uso (PublicarLapida, ListarCementerio...)
│     │  └─ infrastructure/   # controladores Nest, repositorio Mongo
│     ├─ categorias/          # CRUD de categorías (solo admin)
│     ├─ coronas/             # una corona por usuario y lápida
│     ├─ comentarios/
│     ├─ ranking/             # Salón del Honor y Asesinos Seriales
│     ├─ usuarios/            # perfil, insignias, autenticación
│     └─ shared/
├─ frontend/
│  └─ src/
│     └─ features/
│        ├─ inicio/
│        ├─ ranking/
│        ├─ publicar/
│        ├─ lapida/
│        ├─ categorias/       # pantalla de CRUD (admin)
│        └─ perfil/
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ README.md
```

En el paso 1 la estructura será más plana; esta es la meta del paso 2.

## Diseño

Estilo retro pixelado de cementerio:

- Tipografías: **Press Start 2P** (títulos y navegación) y **Space Mono** (texto).
- Paleta: fondo naranja arena `#F2B87A`, marrón oscuro `#2E1305`, dorado `#E8C547`, crema `#F5E0B8`, menta `#DCF2E9` para las tarjetas y marrón tierra `#8B4513` para detalles.

## Entorno de desarrollo

- Windows + VSCode, con Docker y pnpm instalados. Más adelante, quizá LazyVim con WSL.
- Se trabaja desde dos computadoras (no simultáneamente), así que todo debe levantarse igual en ambas. Por eso Docker y pnpm, y por eso este README debe tener el contexto completo.
- **Puerto de MongoDB**: ya hay un MongoDB instalado sin Docker que ocupa el puerto `27017`. El contenedor debe publicarse en otro puerto del host (`27018` en el ejemplo), y la app debe conectarse a ese:

```yaml
# docker-compose.yml
services:
  mongo:
    image: mongo:7
    ports:
      - "27018:27017"   # host:contenedor
    volumes:
      - mongo-data:/data/db   # los datos sobreviven al reiniciar el contenedor

volumes:
  mongo-data:
```

Cadena de conexión desde tu máquina: `mongodb://localhost:27018/riplanta`.

## Cómo correrlo

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Arrancar la aplicación

El backend necesita MongoDB. Levantá el contenedor y después abrí dos terminales
desde la raíz:

```bash
docker compose up -d mongo

# Terminal 1
pnpm --filter backend run start:dev

# Terminal 2
pnpm --filter frontend run dev
```

Abre la URL que indique Vite, normalmente `http://localhost:5173`.

### 3. Ejecutar pruebas y builds

```bash
pnpm --filter backend run test
pnpm --filter backend run test:e2e
pnpm --filter frontend run test
pnpm --filter backend run build
pnpm --filter frontend run build
```

La guía completa, la checklist manual y ejemplos de `curl` están en
[docs/README.md](./docs/README.md).

### MongoDB

MongoDB ya está conectado al backend. Levanta el contenedor antes de Nest:

```bash
docker compose up -d mongo
```

La cadena predeterminada es `mongodb://localhost:27018/riplanta`. Para cambiarla,
copia [backend/.env.example](./backend/.env.example) como `backend/.env` y edita
`MONGODB_URI`. Las colecciones se inicializan con datos semilla automáticamente.
Los datos sobreviven al reinicio porque Docker usa el volumen `mongo-data`.

#### Datos semilla

Al arrancar, el backend siembra **idempotentemente** (`$setOnInsert` + upsert, así que
reiniciar no duplica nada):

- **Usuarios**: `admin` (`rol: 'admin'`, credenciales por `ADMIN_USERNAME` /
  `ADMIN_PASSWORD`), `jardinera` (`rol: 'usuario'`, para tener un segundo dueño real y
  poder verificar el ranking con más de una fila) y `zombie` (`rol: 'zombie'`, dueño de
  las lápidas huérfanas, sin contraseña utilizable).
- **Categorías**: 6, con vocabulario del dominio.
- **Lápidas**: 10, con `coronasCount` variado (de 0 a ~15) para que el Salón del Honor
  tenga un orden real, y al menos dos a nombre de `zombie` para poder ver los dos estados
  sin fabricarlos a mano.

El orden importa: primero se siembra el zombie, después se migran las lápidas huérfanas a
él, y recién entonces se siembran los datos.

> **Las pruebas e2e escriben en la base de `.env`.** Hoy la suite lee `MONGODB_URI` de
> `backend/.env`, que apunta a la base de desarrollo. Mientras eso no se separe, cada
> corrida de `pnpm --filter backend run test:e2e` deja usuarios y lápidas de prueba en
> `riplanta`. (Las fotos sí van a un temporal: los e2e definen `UPLOADS_DIR`.)

### Sesiones y administración

El backend administra sesiones en el servidor y entrega al cliente solo un token
opaco en una cookie **httpOnly**. La cookie no se puede leer desde JavaScript;
en MongoDB se guarda únicamente el SHA-256 del token, nunca el token en claro.

```bash
# 1. Login: guarda la cookie en cookies.txt
curl -c cookies.txt -X POST http://localhost:3000/sesiones \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"riplanta123"}'

# 2. ¿Quién soy?
curl -b cookies.txt http://localhost:3000/sesiones/actual

# 3. Crear una categoría como admin
curl -b cookies.txt -X POST http://localhost:3000/categorias \
  -H 'Content-Type: application/json' -d '{"nombre":"Suculentas"}'

# 4. Cerrar sesión
curl -b cookies.txt -X DELETE http://localhost:3000/sesiones
```

| Método | Ruta | Resultado |
|---|---|---|
| POST | `/sesiones` | Inicia sesión con `{ username, password }` y devuelve la cookie |
| GET | `/sesiones/actual` | Sesión vigente o `401` |
| DELETE | `/sesiones` | Cierra la sesión y borra la cookie (`204`) |

El administrador se siembra al arrancar desde `ADMIN_USERNAME` y
`ADMIN_PASSWORD`. Fuera de producción, si `ADMIN_PASSWORD` no está definida, se
usa `riplanta123` y el log lo advierte. En producción es obligatoria: sin ella no
se crea el administrador y se registra un error. La sesión dura 8 horas por
defecto (`SESION_TTL_HORAS`). Un reinicio del backend no cierra las sesiones,
porque viven en MongoDB y no en memoria.

La cookie usa `SameSite=Lax`, que frena los `POST` cross-site (mitigación básica
de CSRF). El CORS acepta credenciales porque el frontend corre en otro puerto;
en producción conviene reemplazar `origin: true` por una allowlist explícita. Para
que el navegador envíe y guarde la cookie, el `fetch` del frontend tiene que usar
`credentials: 'include'`. El login frena la fuerza bruta: tras cinco fallos del mismo
origen (IP + usuario) en quince minutos responde `429` sin gastar otra comparación
bcrypt, y limita a ocho las comparaciones simultáneas para que un flood no sature el
event loop. El contador es en memoria: con varias instancias hace falta Redis.

### Autorización: middlewares, no guards

Toda la autorización se implementa con **middlewares** aplicados por ruta en cada
módulo. Hay cuatro:

| Middleware | Qué exige | Dónde está aplicado |
|---|---|---|
| `SesionesMiddleware` | Nada: resuelve `req.sesion` y no bloquea | Global (`AppModule`) |
| `SesionRequeridaMiddleware` | Sesión iniciada, cualquier rol → si no, `401` | `POST /lapidas`, `POST /lapidas/:id/corona`, `POST /lapidas/:id/comentarios` |
| `DuenoOAdminLapidaMiddleware` | Sesión **y** ser el dueño de la lápida o `admin`. Carga la lápida y la adjunta a la request | `PUT`/`DELETE /lapidas/:id`, `POST /lapidas/:id/foto` |
| `AdminMiddleware` | Rol `admin` → si no, `401` sin sesión / `403` con rol `usuario` | Las tres mutaciones de `/categorias`, `DELETE /comentarios/:id` |

Reglas que de ahí salen:

- Los `GET` de `/lapidas`, `/lapidas/:id`, `/lapidas/asesinos`,
  `/lapidas/:id/comentarios` y `/categorias` son **públicos**.
- Publicar, coronar y comentar piden sesión, pero cualquier rol logueado alcanza.
- Editar, borrar o subir la foto de una lápida piden ser su dueño o `admin`.
- El CRUD de categorías y el borrado de comentarios son **solo `admin`**.

### Propiedad de la lápida

Cada lápida tiene un `usuarioId` obligatorio. **No hay lápidas sin dueño**: al arrancar,
una migración idempotente le entrega al usuario reservado **`zombie`** las que aparezcan
huérfanas (datos viejos o escritos directo en Mongo). No se borra ninguna.

- `zombie` tiene `rol: 'zombie'`, un `passwordHash` aleatorio e intratable —nadie puede
  iniciar sesión con él— y **no autoriza nada** en ningún endpoint.
- `GET /lapidas` y `GET /lapidas/:id` devuelven cada lápida con
  `duenio: { username, rol }`, resuelto contra `usuarios`. El front distingue el estado
  zombie por `duenio.rol`, **no** comparando usernames.
- `GET /lapidas/asesinos` excluye al zombie: no es un jugador, es el estado de una lápida.
- No confundir con la insignia **Superviviente Zombie**, que es otra cosa.
- `POST /usuarios` rechaza los nombres reservados `admin` y `zombie` con `400` (no es
  `409`: no choca con un registro previo, es un nombre prohibido).
- El borrado de usuarios **no existe todavía**. La regla "si se borra el dueño se borran
  sus lápidas, comentarios, coronas, sesiones y archivos de foto" queda documentada como
  la política a implementar cuando exista.

### Comentarios

- `GET /lapidas/:id/comentarios` es público y devuelve los comentarios por fecha
  ascendente. Un `404` si la lápida no existe, en vez de una lista vacía: una lista vacía
  mentiría sobre el estado del recurso.
- `POST /lapidas/:id/comentarios` pide sesión. El `texto` tiene un tope de **500**
  caracteres y es el **único** campo que el cliente puede mandar: `autor` y `usuarioId`
  salen de la sesión.
- `DELETE /comentarios/:id` es **solo para `admin`** (D5). El autor no borra el suyo.
- No hay deduplicación: comentar dos veces la misma lápida crea dos comentarios.
- El id expuesto es el `_id` de Mongo como string, no un contador.

### Coronas

- `POST /lapidas/:id/corona` exige sesión (dejó de ser anónimo) y **solo se puede dar una
  vez por usuario y lápida** (D4): la segunda devuelve `409`. La restricción la garantiza
  un índice único en la colección `coronas`, no una consulta previa.
- `coronasCount` sigue denormalizado en la lápida y se incrementa solo si la corona se
  insertó de verdad, así que el contador nunca se adelanta al registro que lo justifica.

### Foto de la planta

`POST /lapidas/:id/foto` (multipart, campo `foto`) es la **única** vía para cargar la
foto: el JSON de crear/editar ignora `fotoUrl`.

- El nombre del archivo lo decide el servidor: `randomUUID()` más la extensión del tipo
  detectado. **Nunca** el nombre que manda el cliente.
- El tipo se valida por **magic bytes** (JPEG, PNG o WebP), no por el `mimetype` ni la
  extensión declarados. Un archivo que no es imagen → `415`.
- Tope de **5 MB** por archivo → `413` si lo supera. Sin archivo → `400`.
- Se guarda en `backend/var/uploads/` (ignorado por git) y se sirve estático en
  `/uploads/<archivo>`. Al reemplazar la foto se borra la anterior, y al borrar la lápida
  se borra la suya (ambos best-effort).
- El almacenamiento está detrás de la interfaz `AlmacenamientoService`, para poder pasar a
  S3/R2 sin tocar los controladores.

### Registro de cuentas

`POST /usuarios` crea una cuenta con `{ username, password }` y **sin email** (D1).

- El `rol` **nunca** se lee del cuerpo: siempre es `usuario`. El administrador sale solo
  del seed. `admin` y `zombie` están reservados → `400`.
- `409` si el nombre ya está en uso, y lo decide el índice `unique` de `username` en vez
  de una consulta previa (evita la carrera entre comprobar e insertar).
- `password`: mínimo 8 caracteres. `username`: máximo 50.
- **Auto-login**: devuelve la misma cookie httpOnly que el login, así que el front queda
  logueado al crear la cuenta. Comparte el rate-limit de `POST /sesiones`.
- La respuesta nunca incluye `passwordHash`.

### Recuperar contraseña (pendiente)

`POST /usuarios` y el login funcionan, pero **recuperar o restablecer la contraseña
todavía no existe**: necesita un proveedor de email y el campo `email` en `usuarios`, que
hoy no se pide (D1). Consecuencia aceptada: al implementarlo habrá que **migrar los
usuarios existentes**, porque ninguno tiene email con el que recuperar la cuenta.

Diseño previsto: token opaco aleatorio guardado **solo como SHA-256** (mismo patrón que
las sesiones), TTL de 30 minutos, un solo uso, e invalidación de todas las sesiones del
usuario al cambiar la contraseña. La respuesta sería `202` siempre, exista o no la cuenta.

## Para retomar el proyecto en otro lugar

Resumen para pegar en una conversación nueva:

> Estoy construyendo R.I.Planta, un cementerio de plantas (lápidas con epitafio, coronas como votos) para aprender NestJS, React + Vite, TypeScript, MongoDB, pnpm y Docker. Vengo de PHP y nunca he usado frameworks, builds ni gestores de dependencias, así que explícame cómo funciona cada cosa y por qué se escribe así, no solo el código. Hay prototipo de diseño y un modelo de datos en MongoDB (en este README), pero no hay código. Las categorías son una colección con su propia pantalla de CRUD (falta diseñarla). Voy en el paso 1 (versión simple), fase 0. Después refactorizo a arquitectura hexagonal con scream architecture. Tengo un MongoDB local en el puerto 27017, así que el de Docker va en el 27018.

## Roadmap

- [ ] Resolver las decisiones abiertas de la revisión
- [ ] Paso 1, fase 0: entorno
- [ ] Paso 1, fases 1 a 6
- [ ] Paso 2: refactor a hexagonal
