# R.I.Planta 🪦🌱

Red social retro donde la gente publica **lápidas** para las plantas que no sobrevivieron: un cementerio de plantas con humor. Es un **proyecto de práctica** para aprender el stack web moderno (sobre todo **NestJS**) y arquitectura de software de forma aplicada. El producto es simple a propósito: el foco está en los conceptos, no en las funciones.

🎨 [Prototipo de diseño](https://claude.ai/artifact/9VPqJgLvSnqa3pyiaxUiBE) (5 pantallas, estilo retro pixelado; falta diseñar la pantalla de categorías)

## Estado actual

- ✅ Prototipo de diseño (5 pantallas)
- ✅ Esquema de datos original (relacional) y su traducción a MongoDB (propuesta)
- ⬜ Pantalla de CRUD de categorías: falta diseñarla en el prototipo
- ⬜ Entorno, backend y frontend: **todavía no hay código**

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
  email,             // índice único
  passwordHash,      // hash de bcrypt, nunca la contraseña en claro
  rol,               // 'usuario' | 'admin' (antes era un bit)
  plantasAsesinadas, // contador, ver nota abajo
  creadoEn
}

// lapidas
{
  _id, nombrePlanta, epitafio,
  fechaFallecimiento, fechaPublicacion,
  autorId,           // referencia a usuarios._id
  categoriaIds,      // referencias a categorias._id
  causaMuerte, fotoUrl,
  coronasCount       // contador, ver nota abajo
}

// categorias
{ _id, nombre }   // nombre: índice único, máximo 20 caracteres

// coronas
{ _id, usuarioId, lapidaId, fecha }   // índice único (usuarioId, lapidaId)

// comentarios
{ _id, lapidaId, usuarioId, comentario, fecha }
```

**Por qué así**

- **Una corona por usuario y lápida**: en SQL lo garantizaba la clave primaria compuesta. En Mongo lo garantiza un **índice único** sobre `(usuarioId, lapidaId)`. Sin ese índice, dos peticiones simultáneas podrían crear dos coronas.
- **Contadores (`coronasCount`, `plantasAsesinadas`)**: los rankings se muestran en casi todas las pantallas. Calcularlos con `COUNT` o agregaciones en cada visita es caro; guardar el número y actualizarlo con `$inc` (operación atómica) es rápido. El costo es que hay que mantenerlos sincronizados al dar o quitar una corona o publicar una lápida.
- **`passwordHash`**: el hash de bcrypt se guarda completo. El campo original `password varchar(60)` apuntaba a lo mismo.
- **Categorías por referencia (no por nombre)**: como se pueden renombrar desde el CRUD, la lápida guarda el **id** de la categoría. Si guardara el nombre, renombrar una categoría obligaría a actualizar todas las lápidas que la usan. Con el id, el nombre vive en un solo lugar.

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

## Revisión: decisiones abiertas

Al comparar el esquema con el prototipo, estos puntos siguen sin decidir:

| # | Tema | Situación |
|---|------|-----------|
| 1 | **Foto de la planta** | El formulario de Publicar la pide. Falta decidir dónde se guarda el archivo; la lápida solo guardaría su URL (`fotoUrl`). |
| 2 | **Causa de muerte** | Las tarjetas y el detalle la muestran, pero el formulario de Publicar no tiene ese campo. Ya está en el documento propuesto. |
| 3 | **Una o varias categorías** | El prototipo permite elegir **una**; el esquema original permitía **varias**. Con la lista `categoriaIds` cualquiera de las dos funciona. |
| 4 | **Autoría** | La tabla puente original permitía varios autores por lápida. La propuesta usa un solo `autorId`, que es lo que muestra el prototipo. |
| 5 | **Insignia Zombie** | No existe en el esquema: faltan el estado "reportada como muerta" y una forma de guardar insignias (por ejemplo, una lista `insignias` en el usuario). |
| 6 | **Fechas** | `fechaPublicacion` debería asignarse siempre al crear. Los comentarios y las coronas sí llevan fecha en la propuesta. |
| 7 | **Rol** | El bit original solo permite 2 valores. La propuesta usa texto (`'usuario'` o `'admin'`), que es más legible y ampliable. |
| 8 | **Borrar una categoría en uso** | Si hay lápidas que la usan, hay que decidir: impedir el borrado, o quitarla de esas lápidas. |
| 9 | **Quién administra categorías** | Se propone solo `admin`; falta confirmarlo. |

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
| 2. Persistencia | Conexión a Mongo, colecciones e índices (incluido el único de coronas), seeds con las 4 categorías iniciales (suculentas, cactus, plantas de interior, árboles frutales) y lápidas de ejemplo | Modelado de documentos, seeds, migraciones |
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

Se completará conforme avance el proyecto. Comandos previstos:

```bash
pnpm install
docker compose up -d      # base de datos
pnpm --filter backend dev
pnpm --filter frontend dev
```

## Para retomar el proyecto en otro lugar

Resumen para pegar en una conversación nueva:

> Estoy construyendo R.I.Planta, un cementerio de plantas (lápidas con epitafio, coronas como votos) para aprender NestJS, React + Vite, TypeScript, MongoDB, pnpm y Docker. Vengo de PHP y nunca he usado frameworks, builds ni gestores de dependencias, así que explícame cómo funciona cada cosa y por qué se escribe así, no solo el código. Hay prototipo de diseño y un modelo de datos en MongoDB (en este README), pero no hay código. Las categorías son una colección con su propia pantalla de CRUD (falta diseñarla). Voy en el paso 1 (versión simple), fase 0. Después refactorizo a arquitectura hexagonal con scream architecture. Tengo un MongoDB local en el puerto 27017, así que el de Docker va en el 27018.

## Roadmap

- [ ] Resolver las decisiones abiertas de la revisión
- [ ] Paso 1, fase 0: entorno
- [ ] Paso 1, fases 1 a 6
- [ ] Paso 2: refactor a hexagonal
