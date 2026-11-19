/**
 * `pnpm demo`: levanta backend + frontend con un solo comando y publica el
 * frontend por un túnel efímero de Cloudflare (trycloudflare).
 *
 * Espera a que Vite responda antes de abrir el túnel para no apuntar cloudflared
 * a un puerto que todavía no está escuchando. El puerto se lee del propio output
 * de Vite: si el 5173 está ocupado, Vite elige otro y el túnel sigue apuntando
 * al servidor correcto. Los tres procesos comparten la terminal: un Ctrl+C (o
 * SIGTERM) los detiene a todos.
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/** Siempre desde la raíz del workspace, aunque se llame desde otro directorio. */
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ESPERA_VITE_MS = 60_000

/** @type {{ nombre: string, proceso: ReturnType<typeof spawn> }[]} */
const procesos = []
let deteniendo = false

function lanzar(nombre, comando, args) {
  console.log(`[demo] arrancando ${nombre}: ${comando} ${args.join(' ')}`)
  const proceso = spawn(comando, args, { cwd: raiz, stdio: 'inherit' })
  procesos.push({ nombre, proceso })
  proceso.on('exit', (codigo, senal) => {
    if (deteniendo) return
    console.error(`[demo] ${nombre} terminó inesperadamente (código ${codigo}, señal ${senal ?? 'ninguna'}).`)
    detenerTodo()
    process.exitCode = codigo ?? 1
  })
  return proceso
}

/**
 * Arranca Vite y resuelve con el puerto que eligió. Hay que leer su salida en
 * vez de asumir el 5173: si ese puerto está ocupado, Vite pasa al siguiente y
 * un túnel fijo al 5173 serviría el servidor ajeno.
 */
function lanzarFrontend() {
  console.log('[demo] arrancando frontend: pnpm --filter frontend run dev')
  const proceso = spawn('pnpm', ['--filter', 'frontend', 'run', 'dev'], {
    cwd: raiz,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  procesos.push({ nombre: 'frontend', proceso })

  return new Promise((resolver, rechazar) => {
    let acumulado = ''
    let encontrado = false

    const leer = (fragmento) => {
      const texto = fragmento.toString()
      process.stdout.write(texto)
      acumulado += texto
      if (!encontrado) {
        const coincide = acumulado.match(/Local:\s+http:\/\/localhost:(\d+)\//)
        if (coincide) {
          encontrado = true
          resolver(Number(coincide[1]))
        }
      }
    }

    proceso.stdout.on('data', leer)
    proceso.stderr.on('data', (fragmento) => process.stderr.write(fragmento.toString()))
    proceso.on('exit', (codigo, senal) => {
      if (deteniendo) return
      console.error(`[demo] frontend terminó inesperadamente (código ${codigo}, señal ${senal ?? 'ninguna'}).`)
      detenerTodo()
      if (!encontrado) rechazar(new Error('El frontend cerró antes de anunciar su puerto.'))
      else process.exitCode = codigo ?? 1
    })
  })
}

function detenerTodo(senal = 'SIGTERM') {
  if (deteniendo) return
  deteniendo = true
  for (const { nombre, proceso } of procesos) {
    if (proceso.exitCode === null && !proceso.killed) {
      console.log(`[demo] deteniendo ${nombre}...`)
      proceso.kill(senal)
    }
  }
}

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => detenerTodo(senal))
}

async function esperarVite(url) {
  const inicio = Date.now()
  while (Date.now() - inicio < ESPERA_VITE_MS) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (respuesta.ok) return
    } catch {
      // Vite todavía no levanta; se reintenta.
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error(
    `Vite no respondió en ${url} tras ${ESPERA_VITE_MS / 1000}s. ` +
      'Revisá el arranque del frontend.',
  )
}

async function main() {
  lanzar('backend', 'pnpm', ['--filter', 'backend', 'run', 'start:dev'])

  const puerto = await lanzarFrontend()
  const url = `http://localhost:${puerto}`

  console.log(`[demo] esperando a Vite en ${url}...`)
  await esperarVite(url)

  console.log('[demo] Vite listo. Abriendo el túnel de Cloudflare...')
  lanzar('cloudflared', 'cloudflared', ['tunnel', '--url', url])
  console.log('[demo] la URL del túnel la imprime cloudflared arriba (https://*.trycloudflare.com).')
  console.log('[demo] Ctrl+C detiene todo.')
}

main().catch((error) => {
  console.error(`[demo] ${error.message}`)
  detenerTodo()
  process.exitCode = 1
})
