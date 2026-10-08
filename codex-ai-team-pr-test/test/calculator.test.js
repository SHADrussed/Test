import test from 'node:test';
import assert from 'node:assert/strict';
import { add, subtract } from '../src/calculator.js';

test('add returns the sum of two numbers', () => {
  assert.equal(add(2, 3), 5);
});

test('subtract returns the difference of two numbers', () => {
  assert.equal(subtract(5, 3), 2);
  assert.equal(subtract(3, 5), -2);
});
