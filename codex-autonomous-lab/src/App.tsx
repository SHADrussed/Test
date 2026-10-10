import { useMemo, useState, type FormEvent } from 'react'
import { loadTasks, saveTasks, type Task, type TaskStatus } from './taskStorage'

type Filter = 'all' | TaskStatus
type Notice = { kind: 'warning' | 'error'; message: string }

const statusLabels: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  'in-progress': 'В работе',
  done: 'Готово',
}
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'todo', label: 'К выполнению' },
  { value: 'in-progress', label: 'В работе' },
  { value: 'done', label: 'Готово' },
]

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function App() {
  const [initial] = useState(loadTasks)
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [notice, setNotice] = useState<Notice | null>(initial.warning ? { kind: 'warning', message: initial.warning } : null)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  function commitTasks(next: Task[]) {
    setTasks(next)
    const error = saveTasks(next)
    setNotice(error ? { kind: 'error', message: error } : null)
  }

  function resetForm() {
    setTitle('')
    setDetails('')
    setEditingId(null)
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const next = editingId
      ? tasks.map((task) => task.id === editingId ? { ...task, title: cleanTitle, details: details.trim() } : task)
      : [{ id: makeId(), title: cleanTitle, details: details.trim(), status: 'todo' as const }, ...tasks]
    commitTasks(next)
    resetForm()
  }

  function editTask(task: Task) {
    setEditingId(task.id)
    setTitle(task.title)
    setDetails(task.details)
    document.getElementById('task-title')?.focus()
  }

  function deleteTask(id: string) {
    commitTasks(tasks.filter((task) => task.id !== id))
    if (editingId === id) resetForm()
  }

  function changeStatus(id: string, status: TaskStatus) {
    commitTasks(tasks.map((task) => task.id === id ? { ...task, status } : task))
  }

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    return tasks.filter((task) => {
      const matchesFilter = filter === 'all' || task.status === filter
      const matchesQuery = !normalizedQuery || `${task.title} ${task.details}`.toLocaleLowerCase('ru').includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [filter, query, tasks])

  const completedCount = tasks.filter((task) => task.status === 'done').length

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> ЛИЧНОЕ ПРОСТРАНСТВО</div>
        <h1>Мои задачи</h1>
        <p>Соберите планы в одном месте и двигайтесь вперёд.</p>
      </header>

      <section className="task-panel" aria-label="Список задач">
        <div className="panel-heading">
          <div>
            <h2>Ваш план</h2>
            <p>{tasks.length ? `Готово ${completedCount} из ${tasks.length}` : 'Новый день — хороший повод начать'}</p>
          </div>
          <span className="task-total" aria-label={`Всего задач: ${tasks.length}`}>{String(tasks.length).padStart(2, '0')}</span>
        </div>

        {notice && <div className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
          <button className="notice-close" type="button" aria-label="Скрыть сообщение" onClick={() => setNotice(null)}>×</button>
        </div>}

        <form className="task-form" onSubmit={saveTask}>
          <label htmlFor="task-title">Название задачи</label>
          <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, подготовить план на неделю" required maxLength={120} />
          <label htmlFor="task-details">Подробности <span className="optional">необязательно</span></label>
          <textarea id="task-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Добавьте заметку или следующий шаг" rows={3} maxLength={500} />
          <div className="form-actions">
            {editingId && <button className="button button-quiet" type="button" onClick={resetForm}>Отмена</button>}
            <button className="button button-primary" type="submit">{editingId ? 'Сохранить изменения' : 'Добавить задачу'} <span aria-hidden="true">↗</span></button>
          </div>
        </form>

        <div className="list-tools">
          <label className="search-box" htmlFor="task-search">
            <span aria-hidden="true">⌕</span>
            <input id="task-search" aria-label="Найти задачу" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти задачу" />
          </label>
          <div className="filter-list" aria-label="Фильтр задач" role="group">
            {filters.map((item) => <button key={item.value} type="button" className={`filter-button${filter === item.value ? ' is-active' : ''}`} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
          </div>
        </div>

        <div className="task-list" aria-live="polite">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✳</span>
              <h3>{tasks.length === 0 ? 'Пока здесь пусто' : 'Ничего не найдено'}</h3>
              <p>{tasks.length === 0 ? 'Добавьте первую задачу — и она появится в вашем плане.' : 'Измените запрос или выберите другой фильтр.'}</p>
            </div>
          ) : visibleTasks.map((task, index) => (
            <article className={`task-card task-${task.status}`} key={task.id}>
              <div className="task-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="task-copy">
                <h3>{task.title}</h3>
                {task.details && <p>{task.details}</p>}
              </div>
              <label className="status-control">
                <span className="visually-hidden">Статус задачи «{task.title}»</span>
                <select aria-label={`Статус задачи «${task.title}»`} value={task.status} onChange={(event) => changeStatus(task.id, event.target.value as TaskStatus)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <div className="task-actions">
                <button className="icon-button" type="button" aria-label={`Изменить задачу «${task.title}»`} onClick={() => editTask(task)}>Изменить</button>
                <button className="icon-button danger" type="button" aria-label={`Удалить задачу «${task.title}»`} onClick={() => deleteTask(task.id)}>Удалить</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer>Ваш темп. Ваш порядок.</footer>
    </main>
  )
}
