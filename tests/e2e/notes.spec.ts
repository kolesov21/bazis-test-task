import { expect, test, type Page } from '@playwright/test'

async function saveNote(page: Page) {
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.locator('.editing-status')).toHaveText('Сохранено')
}

async function createNote(page: Page, title = 'Планы на неделю') {
  await page.goto('/notes/new')
  await page.getByLabel('Название заметки', { exact: true }).fill(title)
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Текст задачи 1', exact: true })
    .fill('Подготовить проект')
  await saveNote(page)
  await expect(page).toHaveURL(/notes\/(?!new)[a-z0-9-]+$/)
  await expect(
    page.getByRole('heading', { name: 'Редактирование заметки', exact: true }),
  ).toBeAttached()
  return page.url()
}

async function dismissChanges(page: Page) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отменить редактирование', exact: true })
    .click()
}

test('creates, previews, edits, reloads and confirms deletion', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Большие планы начинаются с заметки' }),
  ).toBeVisible()
  const url = await createNote(page)
  await page.getByRole('checkbox').check()
  await saveNote(page)
  await page.reload()
  await expect(page.getByRole('checkbox')).toBeChecked()
  await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
  await expect(page.locator('.note-preview')).toHaveCount(1)
  await expect(page.locator('.note-preview input[type=checkbox]')).toHaveCount(0)
  await expect(page.locator('.note-preview')).toContainText('Подготовить проект')
  await page.getByRole('button', { name: 'Удалить заметку «Планы на неделю»' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Оставить заметку' }).click()
  await expect(page.locator('.note-preview')).toHaveCount(1)
  await page.getByRole('button', { name: 'Удалить заметку «Планы на неделю»' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить заметку', exact: true })
    .click()
  await expect(page.locator('.note-preview')).toHaveCount(0)
  await page.goto(url)
  await expect(page.getByRole('heading', { name: 'Заметка не найдена' })).toBeVisible()
  expect(errors).toEqual([])
})

test('groups typing, undoes and redoes from focused text fields', async ({ page }) => {
  await createNote(page)
  const title = page.getByLabel('Название заметки', { exact: true })
  await title.fill('Новый заголовок')
  await title.press('ControlOrMeta+z')
  await expect(title).toHaveValue('Планы на неделю')
  await title.press('ControlOrMeta+Shift+z')
  await expect(title).toHaveValue('Новый заголовок')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Отменить изменение', exact: true }).click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('button', { name: 'Отменить изменение', exact: true }).click()
  await expect(title).toHaveValue('Планы на неделю')
  await title.fill('Другая ветка')
  await expect(
    page.getByRole('button', { name: 'Повторить изменение', exact: true }),
  ).toBeDisabled()
})

test('restores unsaved work after reload and clears history on save', async ({ page }) => {
  await createNote(page)
  await page.getByLabel('Название заметки', { exact: true }).fill('Несохранённый заголовок')
  await page.reload()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить', exact: true }).click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Несохранённый заголовок',
  )
  await page.getByRole('checkbox').check()
  await saveNote(page)
  await expect(page.getByRole('button', { name: 'Отменить изменение', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Несохранённый заголовок',
  )
})

test('Escape keeps the recoverable draft and the dialog traps focus', async ({ page }) => {
  await page.goto('/notes/new')
  await page.getByLabel('Название заметки', { exact: true }).fill('Мой черновик')
  await page.reload()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const cancel = dialog.getByRole('button', { name: 'Удалить черновик' })
  const restore = dialog.getByRole('button', { name: 'Восстановить', exact: true })
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(restore).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByLabel('Название заметки', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Выбрать действие' }).click()
  await restore.click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Мой черновик')
})

test('cancel and route navigation confirm discarding changes', async ({ page }) => {
  const url = await createNote(page)
  await page.getByLabel('Название заметки', { exact: true }).fill('Не сохранять')
  await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page).toHaveURL(url)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await dismissChanges(page)
  await expect(page).toHaveURL('/')
  await page.goto(url)
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Планы на неделю')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('validates empty fields, task deletion and undo', async ({ page }) => {
  await page.goto('/notes/new')
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Добавьте название')
  await page.getByLabel('Название заметки', { exact: true }).fill('Заметка')
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Заполните текст')
  await page.getByRole('textbox', { name: 'Текст задачи 1', exact: true }).fill('Задача')
  await page.getByRole('button', { name: 'Удалить задачу 1' }).click()
  await expect(page.locator('.todo-row')).toHaveCount(0)
  await page.getByRole('button', { name: 'Отменить изменение', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Текст задачи 1', exact: true })).toHaveValue(
    'Задача',
  )
  await saveNote(page)
  await expect(page).toHaveURL(/notes\/(?!new)[a-z0-9-]+$/)
})

test('handles deletion from another tab and preserves work as a new note', async ({
  page,
  context,
}) => {
  await createNote(page)
  const second = await context.newPage()
  await second.goto('/')
  await page.getByLabel('Название заметки', { exact: true }).fill('Сохранённая копия')
  await second.getByRole('button', { name: 'Удалить заметку «Планы на неделю»' }).click()
  await second
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить заметку', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('удалена в другой вкладке')
  await expect(
    page.getByRole('button', { name: 'Сохранить изменения', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Сохранить как новую' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Сохранённая копия',
  )
  await expect(second.locator('.note-preview')).toHaveCount(1)
})

test('keeps drafts independent between tabs editing the same note', async ({ page, context }) => {
  const url = await createNote(page)
  const second = await context.newPage()
  await second.goto(url)
  await page.getByLabel('Название заметки', { exact: true }).fill('Первый черновик')
  await second.getByLabel('Название заметки', { exact: true }).fill('Второй черновик')
  await page.reload()
  await second.reload()
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить', exact: true }).click()
  await second
    .getByRole('dialog')
    .getByRole('button', { name: 'Восстановить', exact: true })
    .click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Первый черновик')
  await expect(second.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Второй черновик',
  )
})

test('truncates previews to three tasks and has no horizontal overflow', async ({ page }) => {
  await createNote(page, 'ДлинноеНазвание'.repeat(12))
  for (let i = 2; i <= 5; i++) {
    await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
    await page
      .getByRole('textbox', { name: `Текст задачи ${i}`, exact: true })
      .fill('ОченьДлиннаяЗадача'.repeat(12))
  }
  await saveNote(page)
  await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
  await expect(page.locator('.preview-todos li')).toHaveCount(3)
  await expect(page.locator('.more-todos')).toHaveText('Ещё 2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('confirms leaving when switching between editor routes', async ({ page }) => {
  const url = await createNote(page)
  await page.getByLabel('Название заметки', { exact: true }).fill('Не потерять')
  const menu = page.getByRole('button', { name: 'Открыть навигацию' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Новая заметка', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page).toHaveURL(url)
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Не потерять')
})

test('waits for a competing write and never resurrects a deleted note', async ({
  page,
  context,
}) => {
  const url = await createNote(page)
  const id = new URL(url).pathname.split('/').pop()!
  const second = await context.newPage()
  await second.goto('/')
  await second.evaluate(async (noteId) => {
    const testWindow = window as typeof window & { releaseNoteLock?: () => void }
    await new Promise<void>((ready) => {
      void navigator.locks.request(
        'bazis:note:' + noteId,
        () =>
          new Promise<void>((release) => {
            testWindow.releaseNoteLock = release
            ready()
          }),
      )
    })
  }, id)
  await page.getByLabel('Название заметки', { exact: true }).fill('Моя версия')
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toBeDisabled()
  await second.evaluate((noteId) => {
    localStorage.setItem(
      'bazis:deleted:' + noteId,
      JSON.stringify({ version: 1, revision: crypto.randomUUID(), note: null }),
    )
    const testWindow = window as typeof window & { releaseNoteLock?: () => void }
    testWindow.releaseNoteLock?.()
  }, id)
  await expect(page.locator('.notice-warning')).toContainText('удалена в другой вкладке')
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Моя версия')
  expect(
    await second.evaluate(
      (noteId) => JSON.parse(localStorage.getItem('bazis:deleted:' + noteId)!).note,
      id,
    ),
  ).toBeNull()
})

test('shows a storage failure without losing the editor contents', async ({ page }) => {
  await page.goto('/notes/new')
  await page.getByLabel('Название заметки', { exact: true }).fill('Не потерять при ошибке')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('bazis:note:'))
        throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.locator('.global-notice')).toContainText('Ваши изменения не сохранены')
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Не потерять при ошибке',
  )
  await expect(page).toHaveURL('/notes/new')
})

test('the skip link does not discard the editing session', async ({ page }) => {
  await createNote(page)
  await page.getByLabel('Название заметки', { exact: true }).fill('Сохранить фокус')
  await page.getByRole('link', { name: 'Перейти к содержимому' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Планы на неделю')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue('Сохранить фокус')
})

test('keeps a draft when reloading while a save waits for a lock', async ({ page, context }) => {
  const url = await createNote(page)
  const id = new URL(url).pathname.split('/').pop()!
  const second = await context.newPage()
  await second.goto('/')
  await second.evaluate(async (noteId) => {
    await new Promise<void>((ready) => {
      void navigator.locks.request('bazis:note:' + noteId, () => {
        ready()
        return new Promise<void>(() => {})
      })
    })
  }, id)
  await page.getByLabel('Название заметки', { exact: true }).fill('Ожидающее сохранение')
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toBeDisabled()
  await page.reload()
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить', exact: true }).click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Ожидающее сохранение',
  )
  await second.close()
})
