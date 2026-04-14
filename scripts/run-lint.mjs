import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

function hasPackage(packageName) {
  try {
    require.resolve(packageName)
    return true
  } catch {
    return false
  }
}

function runNodeScript(modulePath, args = []) {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.error) {
    console.error(result.error.message)
    return 1
  }
  return result.status ?? 1
}

const hasEslintRuntime = hasPackage('eslint') && hasPackage('eslint-config-next')

if (hasEslintRuntime) {
  process.exit(runNodeScript(require.resolve('next/dist/bin/next'), ['lint']))
}

console.warn(
  'ESLint dependencies are not installed in this environment. Running Next.js build/type validation fallback instead.'
)
process.exit(runNodeScript(require.resolve('next/dist/bin/next'), ['build']))
