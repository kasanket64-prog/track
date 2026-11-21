# ContribuTrack — Earlier Development Snapshot

This repository stores an earlier React and TypeScript-based workspace under [`contributrack-main11/`](contributrack-main11/). It is useful as a development snapshot rather than a claim of a production deployment.

## Technologies represented

The nested project declares React, TypeScript, Vite, Tailwind CSS and Supabase-related dependencies. It also includes source folders, configuration and project notes.

## Explore locally

```bash
cd contributrack-main11
npm install
npm run dev
```

The package also defines build, lint and type-check scripts. The commands are documented from `package.json`; they have **not** been verified as passing here.

## Relationship to the newer repository

The separate [`contributrack`](https://github.com/kasanket64-prog/contributrack) repository includes its own application and tests. Treat the repositories as separate snapshots unless their history and feature parity are explicitly compared.

## Current limits

This repository has a nested application layout and minimal prior root documentation. Evaluate and test the source before using it with real sensor, identity or biometric information.
