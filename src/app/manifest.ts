import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CoachMe Fitness',
    short_name: 'CoachMe',
    description: 'Transformez votre parcours sportif avec les meilleurs coachs',
    start_url: '/',
    display: 'standalone', // Makes it behave like a native app (hides browser UI)
    background_color: '#ffffff',
    theme_color: '#14b8a6', // Teal color of the app
    icons: [
      {
        src: '/coachMe-logo.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/coachMe-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/coachMe-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
