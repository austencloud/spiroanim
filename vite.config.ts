import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
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

function serveResetPageInDevelopment(): Plugin {
  return {
    name: 'serve-reset-page-in-development',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.startsWith('/reset/') === true) {
          const suffix = request.url.slice('/reset/'.length)
          if (suffix === '' || suffix.startsWith('?')) {
            request.url = `/reset/index.html${suffix}`
          }
        }
        next()
      })
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
      serveResetPageInDevelopment(),
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
