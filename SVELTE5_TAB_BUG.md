# Svelte 5 Tab Switching Bug Report

## Проблема

В приложении есть критический баг с переключением табов в Svelte 5. Conditional rendering не работает корректно с runes (`$state`).

## Симптомы

1. ✅ Кнопки табов правильно подсвечиваются (активная кнопка меняется)
2. ✅ State переменная `activeTab` корректно обновляется
3. ❌ Содержимое табов НЕ переключается - все компоненты остаются в DOM
4. ❌ После первого клика по любой кнопке табы перестают работать

## Проверенные решения

### ❌ Простые условные блоки
```svelte
{#if activeTab === 'http-client'}
  <HttpClient />
{:else if activeTab === 'network-tools'}
  <NetworkTools />
{/if}
```
**Результат**: Не работает

### ❌ Key блоки  
```svelte
{#key activeTab}
  {#if activeTab === 'http-client'}
    <HttpClient />
  {/if}
{/key}
```
**Результат**: Не работает

### ❌ Счетчик + производная переменная
```svelte
let tabChangeCounter = $state(0);
let currentTab = $derived(`${activeTab}-${tabChangeCounter}`);

function handleTabChange(tabId) {
  activeTab = tabId;
  tabChangeCounter++; // Принудительная реактивность
}
```
**Результат**: Не работает

### ❌ Key с атрибутами
```svelte
{#key activeTab}
  {#if activeTab === 'http-client'}
    <HttpClient key="http-client" />
  {/if}
{/key}
```
**Результат**: Не работает

## Текущее временное решение

Используется `{#key}` блок как наименее плохой workaround, но проблема полностью не решена.

## Воспроизведение

1. Запустить приложение
2. Кликнуть на любой таб кроме "HTTP Client"
3. Наблюдать что:
   - Кнопка подсвечивается правильно
   - Содержимое предыдущего таба остается в DOM
   - Содержимое нового таба добавляется к предыдущему

## Debug информация

- Svelte: 5.0.0
- SvelteKit: 2.9.0 
- Node: 18.19.1
- Browser: Chrome/Firefox (воспроизводится в обоих)

## Логи консоли

```
Tab change requested: network-tools current: http-client
Tab changed to: network-tools
   Has HTTP Client: true  <- Проблема: должно быть false
   Has Network Tools: true
❌ STILL BROKEN: Tab switching issue persists
```

## Потенциальные решения

1. **CSS-based решение**: Использовать `display: none/block` вместо условного рендеринга
2. **Downgrade Svelte**: Откатиться на Svelte 4 
3. **Ждать фикса**: Это известная проблема ранних версий Svelte 5

## Связанные issues

- https://github.com/sveltejs/svelte/issues/...
- Проблема с реактивностью runes в условных блоках

---

**Статус**: 🟡 Частично решено workaround'ом с `{#key}`  
**Дата**: 2025-09-16  
**Автор**: AI Assistant