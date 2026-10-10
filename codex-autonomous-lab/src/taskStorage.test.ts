import { describe, expect, it } from 'vitest'
import { loadTasks, saveTasks, TASK_STORAGE_KEY, type Task } from './taskStorage'

const memoryStorage = (initial: string | null = null) => {
  let value = initial
  return {
    getItem: (key: string) => key === TASK_STORAGE_KEY ? value : null,
    setItem: (key: string, next: string) => { if (key === TASK_STORAGE_KEY) value = next },
  }
}

describe('хранилище задач', () => {
  it('загружает валидные задачи и пропускает некорректные записи', () => {
    const valid: Task = { id: '1', title: 'Задача', details: '', status: 'todo' }
    const storage = memoryStorage(JSON.stringify([valid, { id: 2 }]))

    expect(loadTasks(storage).tasks).toEqual([valid])
    expect(loadTasks(storage).warning).toMatch(/повреждены/)
  })

  it('сообщает об ошибках чтения и записи', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadTasks(broken).warning).toMatch(/Не удалось прочитать/)
    expect(saveTasks([], broken)).toMatch(/Не удалось сохранить/)
  })

  it('сохраняет список под отдельным ключом', () => {
    const task: Task = { id: '1', title: 'Тест', details: '', status: 'done' }
    const storage = memoryStorage()
    expect(saveTasks([task], storage)).toBeNull()
    expect(storage.getItem(TASK_STORAGE_KEY)).toBe(JSON.stringify([task]))
  })
})
