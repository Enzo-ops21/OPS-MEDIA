import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TranscriptionPage } from '@/pages/TranscriptionPage'
import { DownloaderPage } from '@/pages/DownloaderPage'
import { getPageById } from '@/config/pages'

function DownloadRoute({ platform }: { platform: string }) {
  const page = getPageById(platform)
  if (!page || page.id === 'transcribe') {
    return <Navigate to="/transcribe" replace />
  }
  return <DownloaderPage page={page} />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/transcribe" replace /> },
      { path: 'transcribe', element: <TranscriptionPage /> },
      { path: 'download/youtube', element: <DownloadRoute platform="youtube" /> },
      { path: 'download/instagram', element: <DownloadRoute platform="instagram" /> },
      { path: 'download/tiktok', element: <DownloadRoute platform="tiktok" /> },
      { path: 'download/spotify', element: <DownloadRoute platform="spotify" /> },
      { path: '*', element: <Navigate to="/transcribe" replace /> },
    ],
  },
])
