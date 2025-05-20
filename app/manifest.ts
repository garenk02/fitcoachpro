import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitCoachPro - The ultimate platform for personal trainers",
    short_name: "FitCoachPro",
    description: "The ultimate platform for personal trainers. Everything You Need to Manage Your Training Business",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2563EB",
    orientation: "portrait",
    scope: "/",
    id: "/",
    categories: ["fitness", "health", "productivity", "business"],
    dir: "ltr",
    lang: "en-US",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        label: "Dashboard"
      },
      {
        src: "/screenshots/clients.png",
        sizes: "1280x720",
        type: "image/png",
        label: "Client Management"
      }
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "View your dashboard"
      },
      {
        name: "Clients",
        url: "/dashboard/clients",
        description: "Manage your clients"
      },
      {
        name: "Schedule",
        url: "/dashboard/schedule",
        description: "View your schedule"
      }
    ],
    related_applications: []
  };
}
