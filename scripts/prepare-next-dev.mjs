import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const nextDir = path.join(process.cwd(), '.next')
const tracePath = path.join(nextDir, 'trace')
const staleArtifacts = [
  path.join(nextDir, 'server'),
  path.join(nextDir, 'static'),
  path.join(nextDir, 'app-build-manifest.json'),
  path.join(nextDir, 'build-manifest.json'),
  path.join(nextDir, 'react-loadable-manifest.json'),
  path.join(nextDir, 'server-reference-manifest.json'),
  path.join(nextDir, 'cache', 'webpack'),
  path.join(nextDir, 'cache', 'turbopack'),
]

async function main() {
  try {
    await mkdir(nextDir, { recursive: true })

    // Clear generated dev artifacts so the next server/chunk graph is rebuilt
    // from scratch after interrupted runs or framework devtools regressions.
    await Promise.all(
      staleArtifacts.map((artifactPath) =>
        rm(artifactPath, { force: true, recursive: true, maxRetries: 2 })
      )
    )

    // Clear any stale trace file or directory from previous interrupted runs.
    await rm(tracePath, { force: true, recursive: true, maxRetries: 2 })

    // Pre-create the trace file so Next.js does not fail on first open when a stale
    // artifact or transient Windows permission issue is present.
    await writeFile(tracePath, '', { encoding: 'utf8' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to prepare ${tracePath}: ${message}`)
    console.error('Close any other Next.js/node processes using this workspace, then retry `npm run dev`.')
    process.exit(1)
  }
}

await main()
