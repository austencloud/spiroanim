export interface PageSeo {
  appTitle: string
  canonicalPath: string
  description: string
  robots: 'index, follow' | 'noindex, nofollow'
  title: string
}

export const SITE_ORIGIN = 'https://spiroanim.com'
export const SOCIAL_IMAGE_URL = `${SITE_ORIGIN}/images/app-icons/pwa-512x512.png`

const defaultSeo: PageSeo = {
  appTitle: '3D Flow Arts Animation',
  canonicalPath: '/',
  description: 'Create, edit, and play procedural 3D animations for flow arts props.',
  robots: 'noindex, nofollow',
  title: 'SpiroAnim - 3D Flow Arts',
}

const pageSeo: Record<string, PageSeo> = {
  '/': {
    appTitle: '3D Flow Arts Animation',
    canonicalPath: '/',
    description:
      'Explore SpiroAnim, an open-source 3D rendering and animation tool for flow arts props.',
    robots: 'index, follow',
    title: 'SpiroAnim - 3D Flow Arts Animation',
  },
  '/about': {
    appTitle: 'About - Open-Source Flow Arts Rendering',
    canonicalPath: '/about',
    description:
      'Learn about SpiroAnim, its years of development, open-source license, and upcoming improvements.',
    robots: 'index, follow',
    title: 'About SpiroAnim - Open-Source Flow Arts Rendering',
  },
}

export function getPageSeo(path: string): PageSeo {
  return pageSeo[path === '/index' ? '/' : path] ?? defaultSeo
}
