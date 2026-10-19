# Especificación funcional

## Resultado del producto

Una persona puede entrar al cementerio, explorar lápidas, publicar un homenaje, dar
una corona y consultar rankings. Una persona administradora puede organizar categorías.

## Contratos del backend

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/lapidas` | Lista de lápidas |
| GET | `/lapidas/:id` | Detalle o `404` |
| POST | `/lapidas` | Crea una lápida o `400` por payload inválido |
| PUT | `/lapidas/:id` | Actualiza una lápida o `404` |
| DELETE | `/lapidas/:id` | Elimina una lápida o `404` |
| POST | `/lapidas/:id/corona` | Incrementa el contador o `404` |
| GET | `/categorias` | Lista categorías |
| POST | `/categorias` | Crea una categoría validada |
| PUT | `/categorias/:id` | Renombra una categoría o `404` |
| DELETE | `/categorias/:id` | Elimina una categoría o `404` |

## Criterios de aceptación

- Un payload desconocido se rechaza; no se filtran propiedades silenciosamente.
- Una lápida exige nombre, epitafio, fecha ISO válida, categoría, y causa de muerte.
- Una categoría tiene entre 3 y 20 caracteres y no puede ser solo espacios.
- Una corona incrementa exactamente una vez por acción en esta versión sin autenticación.
- El frontend muestra estados útiles: demostración local si la API no está disponible,
  confirmación después de publicar y confirmación antes de eliminar categorías.
- Las pruebas cubren el camino feliz y los errores HTTP principales.

## Casos de uso ODD

| Resultado observable | Flujo |
|---|---|
| Recordar una planta | Cementerio → tarjeta → detalle |
| Participar en el homenaje | Tarjeta/detalle → Dar corona |
| Crear un registro | Publicar → completar formulario → ver tarjeta en cementerio |
| Mantener el vocabulario | Categorías → agregar, editar o eliminar |
| Descubrir popularidad | Rankings → ordenar por coronas |
