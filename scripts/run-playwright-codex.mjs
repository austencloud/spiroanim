import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import process from 'node:process'

const mode = process.argv[2]
const forwardedArguments = process.argv.slice(3)

if (mode !== 'e2e' && mode !== 'pwa') {
  throw new Error('Expected a Playwright mode of "e2e" or "pwa".')
}

const projectRoot = process.cwd()
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js')
const isPwa = mode === 'pwa'
const port = isPwa ? 4173 : 5173
const serverUrl = `http://127.0.0.1:${port}`
const config = isPwa ? 'playwright.pwa.config.ts' : 'playwright.config.ts'
const viteArguments = isPwa
  ? [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port)]
  : [viteCli, '--host', '127.0.0.1', '--port', String(port)]

function spawnNode(arguments_, options = {}) {
  return spawn(process.execPath, arguments_, {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  })
}

async function serverIsAvailable() {
  try {
    const response = await fetch(serverUrl)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(server) {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before ${serverUrl} became available.`)
    }
    if (await serverIsAvailable()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for ${serverUrl}.`)
}

async function stopServer(server) {
  if (server === undefined || server.exitCode !== null) return

  server.kill()
  await Promise.race([once(server, 'exit'), new Promise((resolve) => setTimeout(resolve, 3000))])

  if (server.exitCode === null) server.kill('SIGKILL')
}

let server

try {
  if (!(await serverIsAvailable())) {
    server = spawnNode(viteArguments)
    await waitForServer(server)
  }

  const testProcess = spawnNode(
    [playwrightCli, 'test', '--config', config, ...forwardedArguments],
    {
      env: {
        ...process.env,
        MOZ_DISABLE_CONTENT_SANDBOX: '1',
        PLAYWRIGHT_EXTERNAL_SERVER: '1',
      },
    },
  )
  const [exitCode, signal] = await once(testProcess, 'exit')

  if (signal !== null) throw new Error(`Playwright exited after receiving ${signal}.`)
  process.exitCode = exitCode ?? 1
} finally {
  await stopServer(server)
}
