/**
 * Web-surface single-instance restart support: a pid file under the harness
 * home lets `dsh web restart` stop the previous long-lived server before
 * booting, so an abandoned or still-running previous process cannot hold the
 * port.
 *
 * The pid file is advisory: a stale file whose process is gone is ignored and
 * overwritten by the next successful boot. Cleanup on exit only removes the
 * file when it still names the exiting process, so a replacement server that
 * started while an old process was shutting down keeps its own pid file.
 * @module @deepseek-ai/dsh/web-restart
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, unlinkSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

/** Harness-home-relative directory holding runtime pid files. */
const WEB_PID_DIR = 'run'

/** Pid-file basename for the `dsh web` surface. */
const WEB_PID_FILENAME = 'dsh-web.pid'

/** Default webserver port; used as the fallback when `--port` is absent. */
const DEFAULT_WEB_PORT = 3080

/** How long `dsh web` waits for SIGTERM to stop the previous server before escalating. */
export const WEB_TERM_TIMEOUT_MS = 5_000

/** Poll interval while waiting for the previous process to exit. */
const WEB_TERM_POLL_INTERVAL_MS = 200

/**
 * Absolute path of the `dsh web` pid file.
 * @returns the pid file path under `$DSH_HOME/run`.
 */
export function webPidFilePath(): string {
  return dshHomePath(WEB_PID_DIR, WEB_PID_FILENAME)
}

/**
 * Whether `pid` names a live process.
 *
 * `process.kill(pid, 0)` performs no signal delivery; it only probes
 * existence. `EPERM` also means the process exists but is owned by someone
 * else, so it is still alive from this process's point of view.
 * @param pid - process id to probe.
 * @returns true when the process exists, false on ESRCH.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Read and validate the recorded `dsh web` pid.
 * @returns the recorded pid, or `undefined` for an absent, malformed, or non-positive file.
 */
async function readWebPidFile(): Promise<number | undefined> {
  let text: string
  try {
    text = await readFile(webPidFilePath(), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  const pid = Number(text.trim())
  return Number.isInteger(pid) && pid > 0 ? pid : undefined
}

/**
 * Parse the port a `dsh web` invocation will bind, as the launcher sees it.
 * The webserver owns the authoritative default; this parser only feeds the
 * restart stop step, so it returns the same default when `--port` is absent.
 * `--port 0` requests an OS-assigned port and returns `undefined` because no
 * fixed port can be probed for a previous owner.
 * @param args - the inner web-app arguments after the launcher flags.
 * @returns the port to probe, or `undefined` for an OS-assigned or malformed port.
 */
export function webPortFromArgs(args: readonly string[]): number | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) continue
    if (arg === '--port') {
      const value = args[index + 1]
      if (value === undefined || !/^\d+$/.test(value)) return undefined
      return Number(value) > 0 ? Number(value) : undefined
    }
    if (arg.startsWith('--port=')) {
      const value = arg.slice('--port='.length)
      if (!/^\d+$/.test(value)) return undefined
      return Number(value) > 0 ? Number(value) : undefined
    }
  }
  return DEFAULT_WEB_PORT
}

/**
 * Whether `pid` is a `dsh web` process, verified cheaply from its command
 * line on POSIX hosts. Windows has no one-shot `ps` equivalent here, so it
 * stays permissive. A failed probe returns true: the pid-file owner or the
 * listening-process probe already narrowed the candidate, and a missing `ps`
 * helper should not make restart silently leave the old server running.
 * @param pid - process id to inspect.
 * @returns true when the process should be treated as a `dsh web` server.
 */
function isDshWebProcess(pid: number): boolean {
  if (process.platform === 'win32') return true
  const ps = spawnSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8', timeout: 2_000 })
  if (ps.error !== undefined || ps.status !== 0) return true
  return ps.stdout.includes('dsh') || ps.stdout.includes('deepseek-harness')
}

/**
 * Find every process id listening on `port`.
 *
 * POSIX hosts use `lsof` and verify the candidate's command line mentions dsh;
 * Windows hosts parse `netstat -ano`. The probe is best-effort and returns an
 * empty list when the platform tool is absent or fails, so the restart step
 * falls back to the pid-file path only.
 * @param port - the port whose listener should be found.
 * @returns pids of processes listening on `port`, excluding the current process.
 */
function findListeningPids(port: number): number[] {
  const pids: number[] = []
  if (process.platform === 'win32') {
    const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8', timeout: 2_000 })
    if (netstat.error !== undefined || netstat.status !== 0) return pids
    for (const line of netstat.stdout.split(/\r?\n/)) {
      const columns = line.trim().split(/\s+/)
      const pid = Number(columns.at(-1))
      if (columns.length >= 4 && line.includes(`:${port}`) && line.includes('LISTENING') && Number.isInteger(pid) && pid > 0) {
        pids.push(pid)
      }
    }
    return pids
  }
  const lsof = spawnSync('lsof', ['-nP', '-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8', timeout: 2_000 })
  if (lsof.error !== undefined || lsof.status !== 0) return pids
  for (const token of lsof.stdout.split(/\s+/)) {
    const pid = Number(token)
    if (Number.isInteger(pid) && pid > 0 && isDshWebProcess(pid)) pids.push(pid)
  }
  return pids
}

/**
 * Stop the previous `dsh web` process.
 *
 * A pid file under `$DSH_HOME/run` is the primary record. When it names a
 * live process, that process is stopped. When it is absent — the pre-pid-file
 * generation of `dsh web` — the restart step probes the webserver port
 * through the platform tool (`lsof` on POSIX, `netstat` on Windows) and stops
 * the dsh-listener it finds there. A stale pid file names a process that
 * already exited, so the port owner is not our previous server and is left
 * alone. SIGTERM gives the old tree its ordinary bounded shutdown; a process
 * that survives the grace period is SIGKILLed.
 * @param port - the webserver port to probe when no pid file exists; `undefined` skips the probe.
 * @param timeoutMs - SIGTERM grace period before SIGKILL.
 * @returns true when a live previous process was stopped, false when none needed stopping.
 */
export async function stopPreviousWebProcess(port?: number, timeoutMs = WEB_TERM_TIMEOUT_MS): Promise<boolean> {
  const previous = await readWebPidFile()
  let candidates: number[]
  if (previous !== undefined) {
    candidates = previous !== process.pid && isProcessAlive(previous) ? [previous] : []
  } else {
    candidates = port === undefined ? [] : findListeningPids(port).filter(pid => pid !== process.pid)
  }
  if (candidates.length === 0) return false
  for (const pid of candidates) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch (error) {
      // ESRCH: the process exited between the probe and the signal.
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') continue
      throw error
    }
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!candidates.some(pid => isProcessAlive(pid))) return true
    await new Promise(resolve => setTimeout(resolve, WEB_TERM_POLL_INTERVAL_MS))
  }
  for (const pid of candidates) {
    if (!isProcessAlive(pid)) continue
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') continue
      throw error
    }
  }
  return !candidates.some(pid => isProcessAlive(pid))
}

/**
 * Record the current process as the running `dsh web` server.
 * @param pid - the current process id.
 */
export async function writeWebPidFile(pid: number): Promise<void> {
  const path = webPidFilePath()
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  await writeFile(path, `${pid}\n`, { mode: 0o600 })
}

/**
 * Remove the `dsh web` pid file when it still names the exiting process.
 *
 * Synchronous because it is called from the `exit` event, where asynchronous
 * file work cannot be awaited. A replacement server that already wrote its
 * own pid must not be erased by the old process's exit.
 */
export function cleanupWebPidFile(): void {
  try {
    const raw = readFileSync(webPidFilePath(), 'utf8')
    if (Number(raw.trim()) !== process.pid) return
    unlinkSync(webPidFilePath())
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
