/**
 * datasource 的 storage domain：数据源（凭据为密文）与采集进度。原料不在这里。
 */
import { z } from 'zod'

const domainTable = (schema) => ({ valueSchema: schema })
const isoString = z.string().min(1)

export const datasourceRecord = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  type: z.enum(['postgresql', 'mysql']),
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  username: z.string(),
  passwordSealed: z.string().nullable(),
  scope: z.object({
    schemas: z.array(z.string()).optional(),
    tables: z.array(z.string()).optional(),
  }),
  createdAt: isoString,
  updatedAt: isoString,
})

export const collectionRecord = z.object({
  datasourceId: z.number().int().positive(),
  state: z.enum(['idle', 'running', 'done', 'failed']),
  phase: z.string(),
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  startedAt: isoString.nullable(),
  finishedAt: isoString.nullable(),
  error: z.string().nullable(),
})

export const datasourceDomainSpec = {
  name: 'datasource',
  version: 1,
  tables: {
    datasources: domainTable(datasourceRecord),
    collections: domainTable(collectionRecord),
  },
}
