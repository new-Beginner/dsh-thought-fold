// dsh-diff-viewer 端到端测试样本
// 用途：触发真实的 write / edit diff 卡片，验证插件渲染。

export interface Metrics {
  added: number
  removed: number
  files: number
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

export function sum(values: readonly number[], fallback = 0): number {
  let total = fallback
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    total += value
  }
  return total
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0
  const total = sum(values)
  return total / values.length
}

export function formatMetrics(metrics: Metrics): string {
  const { added, removed, files } = metrics
  const scope = files === 1 ? '1 file' : `${files} files`
  return `+${added} -${removed} · ${scope}`
}

export function lineNumberColumnWidth(highest: number): number {
  const digits = String(Math.max(1, highest)).length
  return 44 + Math.max(0, digits - 2) * 8
}
