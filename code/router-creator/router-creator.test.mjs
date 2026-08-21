import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate, shouldInjectOnEvent } from './router-bootstrap-creator.mjs'

test('renderTemplate replaces known {{model}}/{{cwd}} variables', () => {
  const text = 'You are powered by {{model}} in {{cwd}}.'
  const out = renderTemplate(text, { model: 'deepseek-v4-flash', cwd: 'D:/repo' })
  assert.equal(out, 'You are powered by deepseek-v4-flash in D:/repo.')
})

test('renderTemplate keeps unknown variables literal', () => {
  const text = 'Hello {{missing}} world'
  assert.equal(renderTemplate(text, {}), 'Hello {{missing}} world')
})

test('shouldInjectOnEvent: first tool/result is primary', () => {
  assert.equal(shouldInjectOnEvent({ type: 'tool/result' }, 1, 1), 'primary')
})

test('shouldInjectOnEvent: second tool/result is not a trigger', () => {
  assert.equal(shouldInjectOnEvent({ type: 'tool/result' }, 1, 2), null)
})

test('shouldInjectOnEvent: second tool/call is fallback', () => {
  assert.equal(shouldInjectOnEvent({ type: 'tool/call' }, 2, 0), 'fallback')
})

test('shouldInjectOnEvent: first tool/call is not a trigger', () => {
  assert.equal(shouldInjectOnEvent({ type: 'tool/call' }, 1, 0), null)
})

test('shouldInjectOnEvent: unrelated events return null', () => {
  assert.equal(shouldInjectOnEvent({ type: 'user/message' }, 1, 1), null)
})
