# ATLAS · Autonomous Telemetry & Life-support Health System

Prototype of an autonomous medical monitoring and decision-support system for space missions. It shows the health status of the crew (vital signs, history, pending exams, mission environments) and provides a voice/text conversational assistant for astronauts.

> ⚠️ **Demo prototype.** Crew data is simulated. ATLAS does not provide diagnoses or make mission-safety decisions.

## Features

- **Crew dashboard**: vital signs (heart rate, blood pressure, SpO₂, temperature, glucose, radiation), status (optimal / warning / critical) and history per crew member.
- **Mission environments**: context per environment (e.g. gravity).
- **Pending tasks and exams**: tracking of measurements, exercise and cognitive tests, with translatable demo text (ES → EN).
- **ATLAS assistant**: spoken English conversation (short sentences, warm tone) through a Server Action that queries a Gemini model, with input validation and rate limiting.
- **Voice interface** (`VoiceInterface`) and body twin (`public/body-twin-model.html`).
- **Admin panel** powered by Payload CMS at `/admin`.
- **Clinical roles**: `clinical-users` collection with access control (the `cmo` role can see everyone; other roles only see their own profile).

## Authentication

- **Facial recognition**: registered users can sign in with face recognition.
- **Credentials fallback**: users who are **not registered for facial recognition** can still access the system by signing in with their credentials.

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router) + React 19
- [Payload CMS](https://payloadcms.com/) 4 (beta) with `@payloadcms/figma`
- Tailwind CSS v4
- Recharts, lucide-react
- TypeScript, pnpm, [mise](https://mise.jdx.dev/) (Node ≥ 24)

Generated inside **Figma Make**.

## Project structure

```
src/
├── app/
│   ├── (frontend)/        # App: AtlasApp, VoiceInterface, atlasConversation, data
│   └── (payload)/         # Payload admin/API (managed, do not edit)
├── collections/           # Admins, ClinicalUsers, Media, Folders, Tags
├── lib/                   # Utilities (payload, site settings)
├── payload.config.ts
└── payload-types.ts       # Auto-generated
public/                    # Assets and static HTML views
img/                       # Crew images
.figma/make/               # Lifecycle scripts (install, dev, deploy)
```

## Getting started

Requirements: Node ≥ 24 and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts:

```bash
pnpm build      # payload build
pnpm start      # production server
pnpm format     # oxfmt
```

### Environment variables

Create a `.env.local` file (it is not committed). Payload/Figma backend variables are provided by the Figma Make platform; outside it they may be missing and `pnpm build` may fail. Third-party keys (e.g. the Gemini key used by the assistant) must be defined server-side only, never with a `NEXT_PUBLIC_` prefix.

## Notes

- The admin panel is available at `/admin`.
- `src/app/(payload)/` is not modified.
- `_to_delete/` contains temporary files and can be removed before publishing.

## License

TBD.
