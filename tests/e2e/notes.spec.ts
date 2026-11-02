import { expect, test, type Page } from '@playwright/test'
import type { Draft } from '../../app/domain/storage'

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

async function blockDraftRemoval(page: Page) {
  await page.evaluate(() => {
    const original = Storage.prototype.removeItem
    const testWindow = window as typeof window & { restoreDraftRemoval?: () => void }
    testWindow.restoreDraftRemoval = () => {
      Storage.prototype.removeItem = original
    }
    Storage.prototype.removeItem = function (key: string) {
      if (key.startsWith('bazis:draft:')) throw new DOMException('Blocked', 'SecurityError')
      return original.call(this, key)
    }
  })
}

async function unblockDraftRemoval(page: Page) {
  await page.evaluate(() => {
    const testWindow = window as typeof window & { restoreDraftRemoval?: () => void }
    testWindow.restoreDraftRemoval?.()
  })
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`mobile menu overlays content with ${reducedMotion} and keeps the header visible`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Мобильная навигация')
    await page.emulateMedia({ reducedMotion })
    await page.addInitScript(() => {
      for (let index = 0; index < 8; index++) {
        const id = crypto.randomUUID()
        localStorage.setItem(
          `bazis:note:${id}`,
          JSON.stringify({
            version: 1,
            revision: crypto.randomUUID(),
            note: {
              id,
              title: `Заметка ${index + 1}`,
              todos: [],
              updatedAt: new Date().toISOString(),
            },
          }),
        )
      }
    })
    await page.goto('/')
    const menu = page.getByRole('button', { name: 'Открыть навигацию', includeHidden: true })
    const panel = page.locator('#sidebar-panel')
    const backdrop = page.locator('.mobile-menu-backdrop')
    const heading = page.getByRole('heading', { name: 'Мои заметки', exact: true })
    const create = page.getByRole('main').getByRole('link', { name: 'Новая заметка' })
    const headingBox = (await heading.boundingBox())!
    const createBox = (await create.boundingBox())!
    expect(createBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height)
    await expect(panel).toHaveAttribute('inert', '')
    await expect(backdrop).toBeHidden()
    const before = await heading.boundingBox()
    await menu.click()
    await expect(panel).toBeVisible()
    await expect(backdrop).toBeVisible()
    await expect(panel).not.toHaveAttribute('inert')
    expect(await heading.boundingBox()).toEqual(before)
    const duration = await panel.evaluate((element) => getComputedStyle(element).transitionDuration)
    if (reducedMotion === 'reduce') expect(duration).toBe('0s')
    else expect(duration).toContain('0.16s')
    await panel.getByRole('link', { name: /^Все заметки/ }).focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(backdrop).toBeHidden()
    await expect(menu).toBeFocused()
    await panel.locator('a').first().focus()
    await expect(menu).toBeFocused()
    await page.keyboard.press('Tab')
    expect(await panel.evaluate((element) => element.contains(document.activeElement))).toBe(false)
    await menu.click()
    expect(
      await page.evaluate(() =>
        document
          .elementFromPoint(380, innerHeight - 10)
          ?.classList.contains('mobile-menu-backdrop'),
      ),
    ).toBe(true)
    await page.mouse.click(380, page.viewportSize()!.height - 10)
    await expect(panel).toBeHidden()
    await expect(backdrop).toBeHidden()
    await expect(menu).toBeFocused()
    await expect(page).toHaveURL('/')
    await page.evaluate(() => window.scrollTo(0, 400))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    expect((await page.locator('.sidebar').boundingBox())!.y).toBe(0)
    await menu.click()
    await expect(panel).toHaveCSS('opacity', '1')
    expect((await panel.boundingBox())!.y).toBeCloseTo(
      (await page.locator('.sidebar').boundingBox())!.height - 1,
    )
    await panel.getByRole('link', { name: 'Новая заметка', exact: true }).click()
    await expect(page.getByLabel('Название заметки', { exact: true })).toBeVisible()
    await expect(panel).toBeHidden()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await page.setViewportSize({ width: 320, height: 400 })
    await menu.click()
    await page.locator('#storage-hint').scrollIntoViewIfNeeded()
    const panelBox = (await panel.boundingBox())!
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(400)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(menu).toBeHidden()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toBeVisible()
    await expect(panel).not.toHaveAttribute('inert')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(menu).toBeVisible()
    await expect(panel).toBeHidden()
  })

  test(`page motion respects ${reducedMotion} and keeps navigation guards`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.addInitScript(() => {
      const testWindow = window as typeof window & { pageTransitions: number }
      testWindow.pageTransitions = 0
      document.addEventListener('transitionrun', (event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.classList.contains('document') &&
          event.propertyName === 'opacity'
        )
          testWindow.pageTransitions++
      })
    })
    await page.goto('/')
    await page.getByRole('main').getByRole('link', { name: 'Новая заметка' }).click()
    const title = page.getByLabel('Название заметки', { exact: true })
    await title.fill('Сохранить при переходе')
    await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Продолжить' }).click()
    await expect(page).toHaveURL('/notes/new')
    await expect(title).toHaveValue('Сохранить при переходе')
    await title.press('ControlOrMeta+z')
    await expect(title).toHaveValue('')
    await title.press('ControlOrMeta+Shift+z')
    await expect(title).toHaveValue('Сохранить при переходе')
    await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
    await dismissChanges(page)
    await expect(page.getByRole('heading', { name: 'Мои заметки', exact: true })).toBeVisible()
    await expect(page.locator('.page-enter-active, .page-leave-active')).toHaveCount(0)
    const transitions = await page.evaluate(
      () => (window as typeof window & { pageTransitions: number }).pageTransitions,
    )
    if (reducedMotion === 'reduce') expect(transitions).toBe(0)
    else expect(transitions).toBeGreaterThanOrEqual(2)
    expect(await page.evaluate(() => sessionStorage.getItem('bazis:draft:new'))).toBeNull()
  })
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

test('expands multiline text while editing, undoing, restoring and viewing notes', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/notes/new')
  const title = page.getByLabel('Название заметки', { exact: true })
  const task = page.getByRole('textbox', { name: 'Текст задачи 1', exact: true })
  const longTitle = 'Подробные планы на неделю '.repeat(5) + '\nВторая строка названия'
  const longTask =
    'Подготовить материалы и проверить результат. '.repeat(8) + '\n' + 'Слово'.repeat(40)
  await title.fill(longTitle)
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await task.fill(longTask)
  await title.focus()
  const fullHeight = (await task.boundingBox())!.height
  await task.fill('Короткая задача')
  await expect.poll(async () => (await task.boundingBox())!.height).toBeLessThan(fullHeight)
  await task.press('ControlOrMeta+z')
  await expect(task).toHaveValue(longTask)
  await expect.poll(async () => (await task.boundingBox())!.height).toBe(fullHeight)
  await task.press('ControlOrMeta+Shift+z')
  await expect(task).toHaveValue('Короткая задача')
  await task.press('ControlOrMeta+z')
  await page.reload()
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить', exact: true }).click()
  await expect(title).toHaveValue(longTitle)
  await expect(task).toHaveValue(longTask)
  await saveNote(page)
  await page.reload()
  await expect(title).toHaveValue(longTitle)
  await expect(task).toHaveValue(longTask)
  await page.setViewportSize({ width: 320, height: 640 })
  for (const field of [title, task]) {
    await expect
      .poll(() => field.evaluate((element) => element.scrollHeight - element.clientHeight))
      .toBeLessThanOrEqual(1)
    expect(await field.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect((await field.boundingBox())!.height).toBeGreaterThan(60)
  }
  await page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
  await expect(page.locator('.note-preview h2 a')).toHaveText(longTitle)
  const preview = page.locator('.preview-todos li > span:last-child')
  await expect(preview).toHaveText(longTask)
  await expect(preview).toHaveCSS('white-space', 'pre-wrap')
  expect((await preview.boundingBox())!.height).toBeGreaterThan(60)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
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

for (const deleteOriginal of [false, true]) {
  test(`recovers a copied new-note draft after the original is ${deleteOriginal ? 'deleted' : 'saved'}`, async ({
    page,
    context,
  }) => {
    await page.goto('/notes/new')
    await page.getByLabel('Название заметки', { exact: true }).fill('Исходная заметка')
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('bazis:draft:new')))
      .not.toBeNull()
    const popupPromise = context.waitForEvent('page')
    await page.evaluate(() => {
      window.open('/notes/new', '_blank')
    })
    const second = await popupPromise
    await second
      .getByRole('dialog')
      .getByRole('button', { name: 'Восстановить', exact: true })
      .click()
    await second.getByLabel('Название заметки', { exact: true }).fill('Отдельная копия')
    await saveNote(page)
    await expect(
      page.getByRole('heading', { name: 'Редактирование заметки', exact: true }),
    ).toBeAttached()
    const originalUrl = page.url()
    if (deleteOriginal) {
      await page.getByRole('button', { name: 'Удалить заметку', exact: true }).click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Удалить заметку', exact: true })
        .click()
      await expect(page.getByRole('heading', { name: 'Мои заметки', exact: true })).toBeVisible()
    }
    await expect(second.locator('.notice-warning')).toContainText(
      deleteOriginal ? 'удалена' : 'изменена',
    )
    await expect(
      second.getByRole('button', { name: 'Сохранить изменения', exact: true }),
    ).toBeDisabled()
    await second.getByRole('button', { name: 'Сохранить как новую' }).click()
    await expect(
      second.getByRole('heading', { name: 'Редактирование заметки', exact: true }),
    ).toBeAttached()
    expect(second.url()).not.toBe(originalUrl)
    await expect(second.getByLabel('Название заметки', { exact: true })).toHaveValue(
      'Отдельная копия',
    )
    expect(await second.evaluate(() => sessionStorage.getItem('bazis:draft:new'))).toBeNull()
    await second.reload()
    await expect(second.getByLabel('Название заметки', { exact: true })).toHaveValue(
      'Отдельная копия',
    )
    await expect(second.getByRole('dialog')).not.toBeVisible()
    await page.goto(originalUrl)
    if (deleteOriginal)
      await expect(page.getByRole('heading', { name: 'Заметка не найдена' })).toBeVisible()
    else
      await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
        'Исходная заметка',
      )
  })
}

for (const action of ['cancel', 'navigate'] as const) {
  test(`keeps the editor and history when draft cleanup fails during ${action}`, async ({
    page,
  }) => {
    await page.goto('/notes/new')
    const title = page.getByLabel('Название заметки', { exact: true })
    await title.fill('Сохранить черновик при ошибке')
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('bazis:draft:new')))
      .not.toBeNull()
    const draft = JSON.parse(
      (await page.evaluate(() => sessionStorage.getItem('bazis:draft:new')))!,
    ) as Draft
    await blockDraftRemoval(page)
    const leave = () =>
      action === 'cancel'
        ? page.getByRole('button', { name: 'Отменить', exact: true }).click()
        : page.getByRole('link', { name: 'Все заметки', exact: true }).last().click()
    await leave()
    await dismissChanges(page)
    await expect(page.getByRole('alert')).toContainText('Не удалось удалить черновик')
    await expect(page).toHaveURL('/notes/new')
    await expect(title).toHaveValue('Сохранить черновик при ошибке')
    expect(
      JSON.parse((await page.evaluate(() => sessionStorage.getItem('bazis:draft:new')))!),
    ).toMatchObject({ version: draft.version, note: draft.note, baseRevision: draft.baseRevision })
    await title.press('ControlOrMeta+z')
    await expect(title).toHaveValue('')
    await title.press('ControlOrMeta+Shift+z')
    await expect(title).toHaveValue('Сохранить черновик при ошибке')
    await unblockDraftRemoval(page)
    await leave()
    await dismissChanges(page)
    await expect(page.getByRole('heading', { name: 'Мои заметки', exact: true })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('bazis:draft:new'))).toBeNull()
  })
}

test('keeps recovery available when discarding a draft fails', async ({ page }) => {
  await page.goto('/notes/new')
  await page.getByLabel('Название заметки', { exact: true }).fill('Восстановить после ошибки')
  await page.reload()
  await expect(page.getByRole('dialog')).toBeVisible()
  await blockDraftRemoval(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить черновик' }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось удалить черновик')
  await expect(page.getByLabel('Название заметки', { exact: true })).toBeDisabled()
  await unblockDraftRemoval(page)
  await page.getByRole('button', { name: 'Выбрать действие' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить', exact: true }).click()
  await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
    'Восстановить после ошибки',
  )
  await saveNote(page)
  await expect(
    page.getByRole('heading', { name: 'Редактирование заметки', exact: true }),
  ).toBeAttached()
  expect(await page.evaluate(() => sessionStorage.getItem('bazis:draft:new'))).toBeNull()
})

for (const action of ['save', 'delete'] as const) {
  test(`reports retained draft after a successful ${action}`, async ({ page }) => {
    const url = action === 'delete' ? await createNote(page) : '/notes/new'
    if (action === 'save') await page.goto(url)
    await page.getByLabel('Название заметки', { exact: true }).fill('Текст черновика')
    const draftKey = 'bazis:draft:' + new URL(page.url()).pathname.split('/').pop()!
    await expect
      .poll(() => page.evaluate((key) => sessionStorage.getItem(key), draftKey))
      .not.toBeNull()
    await blockDraftRemoval(page)
    if (action === 'save') {
      await saveNote(page)
      await expect(
        page.getByRole('heading', { name: 'Редактирование заметки', exact: true }),
      ).toBeAttached()
      await expect(page.getByLabel('Название заметки', { exact: true })).toHaveValue(
        'Текст черновика',
      )
    } else {
      await page.getByRole('button', { name: 'Удалить заметку', exact: true }).click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Удалить заметку', exact: true })
        .click()
      await expect(page.getByRole('heading', { name: 'Мои заметки', exact: true })).toBeVisible()
      await expect(page.locator('.note-preview')).toHaveCount(0)
    }
    await expect(page.locator('.global-notice')).toContainText('Не удалось удалить черновик')
    expect(await page.evaluate((key) => sessionStorage.getItem(key), draftKey)).not.toBeNull()
  })
}

for (const restoreDraft of [false, true]) {
  test(`retries an initial storage failure ${restoreDraft ? 'without replacing a recovered draft' : 'and opens the existing note'}`, async ({
    page,
  }) => {
    const url = await createNote(page)
    const title = page.getByLabel('Название заметки', { exact: true })
    if (restoreDraft) await title.fill('Восстановленный черновик')
    await page.addInitScript(() => {
      const original = Storage.prototype.getItem
      let failed = false
      Storage.prototype.getItem = function (key: string) {
        if (!failed && key.startsWith('bazis:note:')) {
          failed = true
          throw new DOMException('Temporary error', 'SecurityError')
        }
        return original.call(this, key)
      }
    })
    await page.reload()
    if (restoreDraft) {
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Восстановить', exact: true })
        .click()
      await title.fill('Правка после восстановления')
    } else await expect(page.getByRole('heading', { name: 'Заметка не найдена' })).toBeVisible()
    await page.getByRole('button', { name: 'Проверить снова' }).click()
    await expect(page.locator('.global-notice')).toHaveCount(0)
    await expect(title).toHaveValue(
      restoreDraft ? 'Правка после восстановления' : 'Планы на неделю',
    )
    if (restoreDraft) {
      await title.press('ControlOrMeta+z')
      await expect(title).toHaveValue('Восстановленный черновик')
    } else {
      await expect(page.locator('.editing-status')).toHaveText('Сохранено')
      await expect(
        page.getByRole('button', { name: 'Отменить изменение', exact: true }),
      ).toBeDisabled()
      await title.fill('Правка после повторного чтения')
    }
    await saveNote(page)
    await expect(page).toHaveURL(url)
    const id = new URL(url).pathname.split('/').pop()!
    const savedTitle = await page.evaluate(
      (noteId) => JSON.parse(localStorage.getItem('bazis:note:' + noteId)!).note.title as string,
      id,
    )
    expect(savedTitle).toBe(
      restoreDraft ? 'Восстановленный черновик' : 'Правка после повторного чтения',
    )
  })
}
