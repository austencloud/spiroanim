import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Connect, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import AutoImport from 'unplugin-auto-import/vite'
import { AutoImports } from './src/sys/auto-imports.ts'
import {
  DEV_PWA_MANIFEST_URL,
  PRODUCTION_PWA_HOSTNAME,
  PWA_MANIFEST_URL,
  devPwaManifest,
  pwaManifest,
} from './src/sys/pwaManifest.ts'

function emitPwaManifests(): Plugin {
  return {
    name: 'emit-pwa-manifests',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `if (location.hostname !== ${JSON.stringify(PRODUCTION_PWA_HOSTNAME)}) document.querySelector('link[rel="manifest"]')?.setAttribute('href', ${JSON.stringify(DEV_PWA_MANIFEST_URL)})`,
          injectTo: 'head',
        },
      ]
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: PWA_MANIFEST_URL.slice(1),
        source: JSON.stringify(pwaManifest),
      })
      this.emitFile({
        type: 'asset',
        fileName: DEV_PWA_MANIFEST_URL.slice(1),
        source: JSON.stringify(devPwaManifest),
      })
    },
  }
}

function serveStandalonePages(): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    const standalonePages = ['reset', 'vtg-reference', 'vtg3']

    for (const page of standalonePages) {
      const route = `/${page}`
      if (request.url?.startsWith(route) !== true) continue

      const suffix = request.url.slice(route.length)
      if (suffix === '' || suffix.startsWith('?')) {
        response.statusCode = 307
        response.setHeader('Location', `${route}/${suffix}`)
        response.end()
        return
      }
      if (suffix === '/') request.url = `${route}/index.html`
      else if (suffix.startsWith('/?')) request.url = `${route}/index.html${suffix.slice(1)}`
    }
    next()
  }

  return {
    name: 'serve-standalone-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export function createViteConfig(isSsrBuild: boolean) {
  return {
    //root: path.resolve(__dirname, 'src'),
    base: '/',
    //base: '/propanim/',
    build: {
      outDir: 'build',
      target: 'es2022',
    },
    server: {
      host: true,
      port: 8080,
    },
    worker: {
      format: 'es' as const,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-worker',
                test: /node_modules[\\/]three[\\/]/,
              },
              {
                name: 'mediabunny-worker',
                test: /node_modules[\\/]mediabunny[\\/]/,
              },
            ],
          },
        },
      },
    },
    plugins: [
      vue(),
      !isSsrBuild && vueDevTools(),
      !isSsrBuild && emitPwaManifests(),
      serveStandalonePages(),
      AutoImport({
        imports: [AutoImports],
        dts: 'src/sys/auto-imports-generated.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ['three'], // Explicitly include Three.js for optimization
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => createViteConfig(isSsrBuild ?? false))
