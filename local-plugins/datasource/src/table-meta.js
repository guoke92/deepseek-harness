/**
 * 把列、外键和索引行收成按表分组的结构。连接器负责查询，这里不访问数据库。
 */

/**
 * @param {object[]} columns 带 tableKey、primary
 * @param {object[]} foreignKeys 带 tableKey、constraint、ordinal
 * @param {object[]} indexes 带 tableKey、seq
 */
export function groupTableMeta(columns, foreignKeys, indexes) {
  const byTable = new Map()
  for (const column of columns) {
    if (!byTable.has(column.tableKey)) {
      byTable.set(column.tableKey, {
        tableKey: column.tableKey,
        comment: column.tableComment || null,
        columns: [],
        primaryKey: [],
        foreignKeys: [],
        indexes: [],
      })
    }
    const table = byTable.get(column.tableKey)
    if (column.tableComment) table.comment = column.tableComment
    table.columns.push({
      name: column.name,
      dataType: column.dataType,
      nullable: Boolean(column.nullable),
      defaultValue: column.defaultValue ?? null,
      comment: column.comment || null,
      ordinal: Number(column.ordinal),
    })
    if (column.primary) table.primaryKey.push({ name: column.name, ordinal: Number(column.ordinal) })
  }
  for (const table of byTable.values()) {
    table.columns.sort((a, b) => a.ordinal - b.ordinal)
    table.primaryKey = table.primaryKey.sort((a, b) => a.ordinal - b.ordinal).map((column) => column.name)
  }
  for (const list of groups(foreignKeys, (fk) => `${fk.tableKey}\0${fk.constraint}`)) {
    list.sort((a, b) => a.ordinal - b.ordinal)
    const table = byTable.get(list[0].tableKey)
    if (!table) continue
    table.foreignKeys.push({
      columns: list.map((item) => item.column),
      refTable: list[0].refTable,
      refColumns: list.map((item) => item.refColumn),
    })
  }
  for (const list of groups(indexes, (index) => `${index.tableKey}\0${index.name}`)) {
    list.sort((a, b) => a.seq - b.seq)
    const table = byTable.get(list[0].tableKey)
    if (!table) continue
    table.indexes.push({
      name: list[0].name,
      unique: Boolean(list[0].unique),
      columns: list.map((item) => item.column),
    })
  }
  return [...byTable.values()]
}

function groups(rows, keyOf) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyOf(row)
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }
  return grouped.values()
}
