import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import AutoImport from 'unplugin-auto-import/vite'
import { AutoImports } from './src/sys/auto-imports.ts'
import {
  DEV_PWA_HOSTNAME,
  DEV_PWA_MANIFEST_URL,
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
          children: `if (location.hostname === ${JSON.stringify(DEV_PWA_HOSTNAME)}) document.querySelector('link[rel="manifest"]')?.setAttribute('href', ${JSON.stringify(DEV_PWA_MANIFEST_URL)})`,
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
    plugins: [
      vue(),
      !isSsrBuild && vueDevTools(),
      !isSsrBuild && emitPwaManifests(),
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
