import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanupWebPidFile, stopPreviousWebProcess, webPidFilePath, webPortFromArgs, writeWebPidFile } from '../src/web-restart.ts'

let home: string
const originalDshHome = process.env.DSH_HOME

afterEach(() => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
})

async function prepareHome(): Promise<string> {
  home = await mkdtemp(join(tmpdir(), 'dsh-web-restart-'))
  process.env.DSH_HOME = home
  return home
}

describe('web restart pid file', () => {
  it('resolves the pid file under $DSH_HOME/run', async () => {
    await prepareHome()
    expect(webPidFilePath()).toBe(join(home, 'run', 'dsh-web.pid'))
  })

  it('parses the web port from app arguments', () => {
    expect(webPortFromArgs([])).toBe(3080)
    expect(webPortFromArgs(['--port', '8080'])).toBe(8080)
    expect(webPortFromArgs(['--port=9090'])).toBe(9090)
    expect(webPortFromArgs(['--no-open', '--port', '8080'])).toBe(8080)
    expect(webPortFromArgs(['--port', '0'])).toBeUndefined()
    expect(webPortFromArgs(['--port', 'abc'])).toBeUndefined()
  })

  it('returns false when no previous server was recorded', async () => {
    await prepareHome()
    await expect(stopPreviousWebProcess(undefined, 50)).resolves.toBe(false)
  })

  it('returns false without signalling when the recorded pid is the current process', async () => {
    await prepareHome()
    await writeWebPidFile(process.pid)
    await expect(stopPreviousWebProcess(undefined, 50)).resolves.toBe(false)
  })

  it('writes and removes the current process pid file', async () => {
    await prepareHome()
    await writeWebPidFile(process.pid)
    expect(await readFile(webPidFilePath(), 'utf8')).toBe(`${process.pid}\n`)
    cleanupWebPidFile()
    await expect(readFile(webPidFilePath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not remove a pid file that already names another process', async () => {
    await prepareHome()
    await writeWebPidFile(999_999)
    cleanupWebPidFile()
    expect(await readFile(webPidFilePath(), 'utf8')).toBe('999999\n')
  })
})
