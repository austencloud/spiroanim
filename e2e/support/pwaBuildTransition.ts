import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { generateSW } from 'workbox-build'

interface StagedPwaBuildTransition {
  replacementCssUrl: string
  restore(): Promise<void>
}

interface FileBackup {
  contents: Buffer
  path: string
}

const SPIRO_ANIM_CSS_PATTERN = /^SpiroAnim-[A-Za-z0-9_-]+\.css$/
const WORKBOX_RUNTIME_PATTERN = /^workbox-[A-Za-z0-9_-]+\.js$/

async function collectWorkboxRuntimeBackups(buildDirectory: string): Promise<FileBackup[]> {
  const names = (await readdir(buildDirectory)).filter((name) => WORKBOX_RUNTIME_PATTERN.test(name))

  return Promise.all(
    names.map(async (name) => {
      const filePath = path.join(buildDirectory, name)
      return { contents: await readFile(filePath), path: filePath }
    }),
  )
}

export async function stagePwaBuildTransition(): Promise<StagedPwaBuildTransition> {
  const buildDirectory = path.resolve('build')
  const assetsDirectory = path.join(buildDirectory, 'assets')
  const assetNames = await readdir(assetsDirectory)
  const currentCssName = assetNames.find((name) => SPIRO_ANIM_CSS_PATTERN.test(name))

  if (!currentCssName) throw new Error('The production build does not contain SpiroAnim CSS.')

  const currentCssPath = path.join(assetsDirectory, currentCssName)
  const replacementCssName = 'SpiroAnim-transition-test.css'
  const replacementCssPath = path.join(assetsDirectory, replacementCssName)
  const scriptNames = assetNames.filter((name) => name.endsWith('.js'))
  const referencingScripts: FileBackup[] = []

  for (const name of scriptNames) {
    const filePath = path.join(assetsDirectory, name)
    const contents = await readFile(filePath)
    if (contents.includes(Buffer.from(currentCssName))) {
      referencingScripts.push({ contents, path: filePath })
    }
  }

  if (referencingScripts.length === 0) {
    throw new Error('No production script references the SpiroAnim CSS chunk.')
  }

  const currentCss = await readFile(currentCssPath)
  const serviceWorkerPath = path.join(buildDirectory, 'sw.js')
  const serviceWorker = await readFile(serviceWorkerPath)
  const workboxRuntimes = await collectWorkboxRuntimeBackups(buildDirectory)
  const originalWorkboxRuntimePaths = new Set(workboxRuntimes.map((backup) => backup.path))

  const restore = async () => {
    await writeFile(currentCssPath, currentCss)
    await writeFile(serviceWorkerPath, serviceWorker)
    await Promise.all(referencingScripts.map((backup) => writeFile(backup.path, backup.contents)))
    await Promise.all(workboxRuntimes.map((backup) => writeFile(backup.path, backup.contents)))

    const currentRootNames = await readdir(buildDirectory)
    const addedWorkboxRuntimes = currentRootNames
      .filter((name) => WORKBOX_RUNTIME_PATTERN.test(name))
      .map((name) => path.join(buildDirectory, name))
      .filter((filePath) => !originalWorkboxRuntimePaths.has(filePath))

    await Promise.all([
      unlink(replacementCssPath).catch(() => undefined),
      ...addedWorkboxRuntimes.map((filePath) => unlink(filePath)),
    ])
  }

  try {
    await writeFile(
      replacementCssPath,
      Buffer.concat([currentCss, Buffer.from('\n/* PWA deployment transition test. */\n')]),
    )
    await Promise.all(
      referencingScripts.map((backup) =>
        writeFile(
          backup.path,
          backup.contents.toString().replaceAll(currentCssName, replacementCssName),
        ),
      ),
    )
    await unlink(currentCssPath)

    const result = await generateSW({
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      globDirectory: buildDirectory,
      globIgnores: ['sw.js', 'workbox-*.js', 'vtg3/**'],
      globPatterns: ['**/*.{css,html,ico,js,png,svg,webmanifest}'],
      navigateFallback: 'app-shell.html',
      navigateFallbackDenylist: [
        /^\/(?:index\/?|about\/?|tips\/?)?$/,
        /^\/docs(?:\/|$)/,
        /^\/vtg-reference(?:\/|$)/,
        /^\/vtg3(?:\/|$)/,
      ],
      swDest: serviceWorkerPath,
    })

    for (const warning of result.warnings) console.warn(warning)
  } catch (error) {
    await restore()
    throw error
  }

  return {
    replacementCssUrl: `/assets/${replacementCssName}`,
    restore,
  }
}
