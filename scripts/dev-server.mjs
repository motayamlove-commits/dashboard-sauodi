import { spawn } from 'node:child_process'

const invokedByPnpm = (process.env.npm_execpath ?? '').includes('pnpm')

if (invokedByPnpm) {
  console.log('pnpm monitor active; the platform-managed Next.js server owns the preview port.')
  setInterval(() => {}, 60 * 60 * 1000)
} else {
  const nextProcess = spawn('next', ['dev', ...process.argv.slice(2)], {
    stdio: 'inherit',
  })

  nextProcess.on('exit', (code) => {
    process.exit(code ?? 1)
  })
}
