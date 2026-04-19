import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const nextDir = path.join(process.cwd(), '.next')
const tracePath = path.join(nextDir, 'trace')

async function main() {
  try {
    await mkdir(nextDir, { recursive: true })

    // Clear any stale file or directory from previous interrupted Next.js runs.
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
