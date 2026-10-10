import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TASK_STORAGE_KEY } from './taskStorage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('управление задачами', () => {
  it('восстанавливает задачи из localStorage при открытии приложения', () => {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify([
      { id: 'saved-task', title: 'Сохранённый план', details: 'Не потерять', status: 'in-progress' },
    ]))
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Сохранённый план' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Статус задачи «Сохранённый план»' })).toHaveValue('in-progress')
  })

  it('показывает пустое состояние, создаёт задачу и сохраняет её', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Пока здесь пусто')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Название задачи'), 'Подготовить демо')
    await user.type(screen.getByLabelText(/Подробности/), 'К пятнице')
    await user.click(screen.getByRole('button', { name: /^Добавить задачу$/ }))

    expect(screen.getByRole('heading', { name: 'Подготовить демо' })).toBeInTheDocument()
    expect(screen.getByText('К пятнице')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) ?? '[]')).toHaveLength(1)
  })

  it('редактирует и удаляет задачу', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Название задачи'), 'Черновик')
    await user.click(screen.getByRole('button', { name: /^Добавить задачу$/ }))
    await user.click(screen.getByRole('button', { name: 'Изменить задачу «Черновик»' }))
    await user.clear(screen.getByLabelText('Название задачи'))
    await user.type(screen.getByLabelText('Название задачи'), 'Готовый черновик')
    await user.click(screen.getByRole('button', { name: /Сохранить изменения/ }))

    const article = screen.getByRole('article')
    expect(within(article).getByRole('heading', { name: 'Готовый черновик' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Удалить задачу «Готовый черновик»' }))
    expect(screen.getByText('Пока здесь пусто')).toBeInTheDocument()
  })

  it('меняет статус, ищет и фильтрует задачи', async () => {
    const user = userEvent.setup()
    render(<App />)
    const title = screen.getByLabelText('Название задачи')
    await user.type(title, 'Подготовить отчёт')
    await user.type(screen.getByLabelText(/Подробности/), 'Проект Альфа')
    await user.click(screen.getByRole('button', { name: /^Добавить задачу$/ }))
    await user.type(title, 'Купить продукты')
    await user.click(screen.getByRole('button', { name: /^Добавить задачу$/ }))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Статус задачи «Подготовить отчёт»' }), 'done')
    await user.click(screen.getByRole('button', { name: 'Готово' }))
    expect(screen.getByRole('heading', { name: 'Подготовить отчёт' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Купить продукты' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Все' }))
    await user.type(screen.getByRole('searchbox', { name: 'Найти задачу' }), 'альфа')
    expect(screen.getByRole('heading', { name: 'Подготовить отчёт' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Купить продукты' })).not.toBeInTheDocument()
  })

  it('сообщает о повреждённом хранилище и продолжает с пустым списком', () => {
    localStorage.setItem(TASK_STORAGE_KEY, '{broken json')
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Не удалось прочитать сохранённые задачи')
    expect(screen.getByText('Пока здесь пусто')).toBeInTheDocument()
  })

  it('показывает ошибку, если браузер не позволяет сохранить задачи', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage disabled') })
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Название задачи'), 'Важная задача')
    await user.click(screen.getByRole('button', { name: /^Добавить задачу$/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить задачи')
    expect(screen.getByRole('heading', { name: 'Важная задача' })).toBeInTheDocument()
  })
})
