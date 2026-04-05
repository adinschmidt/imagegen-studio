# ImageGen Studio

A web-based AI image generation studio that supports multiple providers through a unified interface. Built with Next.js, shadcn/ui, and Tailwind CSS.

## Features

- **Multi-Provider Support** — Generate images using OpenAI, Google (Imagen & Gemini), Grok, OpenRouter, or any OpenAI-compatible API through a single interface.
- **Browser-Side API Keys** — API keys are entered in the UI and stored in your browser's localStorage. No server-side secrets required.
- **Generation Queue** — Queue multiple prompts and generate them sequentially.
- **Gallery & Carousel** — Browse, compare, and manage all your generated images with carousel view.
- **Image Input** — Drop or paste reference images for supported models (edit, remix, variations).
- **Prompt History** — Re-use and iterate on previous prompts.
- **Persistent Storage** — Images saved to IndexedDB so they survive page reloads.
- **Recently Deleted** — Recover accidentally deleted images.
- **Customizable Settings** — Control aspect ratio, quality, resolution, and provider-specific parameters.
- **Proxy Support** — Optional HTTP/SOCKS proxy for API requests.
- **Dark/Light Mode** — Full theme support out of the box.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Deno](https://deno.com) |
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Deployment | [Vercel](https://vercel.com) |

## Prerequisites

- [Deno 2+](https://deno.com) installed
- At least one AI provider API key

## Getting Started

```bash
# Clone the repo
git clone https://github.com/adinschmidt/imagegen-studio.git
cd imagegen-studio

# Install dependencies
deno install

# Start the dev server
deno task dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and enter your API key(s) in **Connection Settings**.

## Configuration

All API keys are configured directly in the browser UI under **Connection Settings**. No `.env.local` or server-side environment variables are required.

Keys are stored in your browser's `localStorage` and sent to provider APIs through the Next.js backend proxy. Only providers with a configured API key will appear in the provider selector.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/            # Image generation endpoint
│   │   └── providers/           # Available providers endpoint
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Main studio page
│   └── globals.css              # Tailwind + custom styles
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── header.tsx               # App header + theme toggle
│   ├── image-generator.tsx      # Main generation orchestrator
│   ├── prompt-input.tsx         # Prompt textarea + controls
│   ├── provider-selector.tsx    # Provider/model picker
│   ├── settings-panel.tsx       # Generation settings
│   ├── image-gallery.tsx        # Generated images grid
│   ├── image-card.tsx           # Single image display card
│   ├── image-carousel.tsx       # Full-screen image carousel
│   ├── image-drop-zone.tsx      # Drag-and-drop image input
│   ├── generation-queue.tsx     # Generation queue UI
│   └── recently-deleted.tsx     # Deleted images recovery
├── hooks/
│   ├── use-image-generation.ts  # Generation request logic
│   ├── use-generation-queue.ts  # Queue management
│   ├── use-image-storage.ts     # IndexedDB persistence
│   └── use-prompt-history.ts    # Prompt history tracking
└── lib/
    ├── providers.ts             # Provider/model registry
    ├── types.ts                 # Shared TypeScript types
    ├── storage.ts               # IndexedDB storage layer
    ├── image-hash.ts            # Perceptual image hashing
    └── utils.ts                 # Utility functions (cn, etc.)
```

## Available Tasks

```bash
deno task dev       # Start dev server with Turbopack
deno task build     # Production build
deno task start     # Start production server
deno task lint      # Run ESLint
```

## Supported Providers & Models

| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | GPT Image 1.5, GPT Image 1, GPT Image 1 Mini | Image input supported |
| Google | Imagen 4 Ultra, Imagen 4, Imagen 4 Fast, Imagen 3, Gemini 3 Pro Image, Gemini 3.1 Flash Image, Gemini 2.5 Flash Image | Up to 4K resolution on Gemini models |
| Grok (xAI) | Grok Imagine Image Pro, Grok Imagine Image | Up to 10 images per request |
| OpenRouter | Gemini, GPT-5 Image, FLUX.2, Seedream 4.5, Riverflow V2, and more | Aggregated access to many providers |
| Custom | Any OpenAI-compatible API | Specify model ID and base URL manually |

## Deployment

Deploy instantly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fadinschmidt%2Fimagegen-studio)

Or via the CLI:

```bash
vercel
```
