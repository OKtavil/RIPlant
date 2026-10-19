# Arquitectura y ruta de aprendizaje

## Mapa

```text
frontend/ React + Vite
    │ HTTP/JSON + CORS
backend/ NestJS
    ├── lapidas/      dominio, DTO, esquema Mongoose, servicio y controlador
    ├── categorias/   dominio, DTO, esquema Mongoose, servicio y controlador
    ├── app.module    conexión MongoDB mediante ConfigModule
    └── shared/       validación global
```

El frontend conoce contratos JSON, no detalles internos de NestJS. Los controladores
traducen HTTP a llamadas de servicio; los servicios contienen las reglas y los modelos
Mongoose persisten los documentos. Los ids numéricos del dominio se mantienen aunque
MongoDB conserve internamente su `_id`, para no romper el contrato inicial del frontend.

## Persistencia MongoDB

El backend se conecta a `MONGODB_URI` y crea dos colecciones (`lapidas` y `categorias`).
Los índices únicos protegen los ids numéricos; los servicios insertan datos semilla solo
cuando la colección está vacía. El contador de coronas usa `$inc`, una operación atómica.

## Próxima secuencia recomendada

1. Extraer interfaces de repositorio (`LapidasRepository`, `CategoriasRepository`).
2. Añadir usuario autenticado y hacer la corona idempotente por `(usuarioId, lapidaId)`.
3. Proteger CRUD de categorías con rol administrador.
4. Añadir pruebas de integración contra MongoDB en Docker CI.

## Principios de mantenimiento

- El vocabulario del dominio permanece en español: `lapida`, `categoria`, `corona`.
- Los mensajes de UI se deciden en React; el backend devuelve códigos HTTP y detalles
  técnicos para desarrollo.
- No se introducen abstracciones antes de que exista un segundo adaptador real.
