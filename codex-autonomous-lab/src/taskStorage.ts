export type TaskStatus = 'todo' | 'in-progress' | 'done'

export type Task = {
  id: string
  title: string
  details: string
  status: TaskStatus
}

export const TASK_STORAGE_KEY = 'codex-autonomous-lab.tasks.v1'
const allowedStatuses = new Set<TaskStatus>(['todo', 'in-progress', 'done'])

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Record<string, unknown>
  return typeof task.id === 'string'
    && task.id.length > 0
    && typeof task.title === 'string'
    && task.title.trim().length > 0
    && task.title.length <= 120
    && typeof task.details === 'string'
    && task.details.length <= 500
    && typeof task.status === 'string'
    && allowedStatuses.has(task.status as TaskStatus)
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): StorageLike {
  return window.localStorage
}

export function loadTasks(storage?: StorageLike): { tasks: Task[]; warning: string | null } {
  try {
    const raw = (storage ?? browserStorage()).getItem(TASK_STORAGE_KEY)
    if (raw === null) return { tasks: [], warning: null }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { tasks: [], warning: 'Сохранённые задачи повреждены. Начните новый список.' }
    const tasks = parsed.filter(isTask)
    return {
      tasks,
      warning: tasks.length === parsed.length ? null : 'Некоторые сохранённые задачи повреждены и были пропущены.',
    }
  } catch {
    return { tasks: [], warning: 'Не удалось прочитать сохранённые задачи. Можно продолжить с пустым списком.' }
  }
}

export function saveTasks(tasks: Task[], storage?: StorageLike): string | null {
  try {
    ;(storage ?? browserStorage()).setItem(TASK_STORAGE_KEY, JSON.stringify(tasks))
    return null
  } catch {
    return 'Не удалось сохранить задачи в этом браузере. Проверьте настройки хранилища.'
  }
}
