import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import CSS from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Vegkart Mikro',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        sizes: 'any',
        href: '/favicon.svg',
      },
      {
        rel: 'stylesheet',
        href: CSS,
      },
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/ol/ol.css',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-base-100">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
