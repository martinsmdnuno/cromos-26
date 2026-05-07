import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { directTrade, giveable, optimizeTrades } from './trade-optimizer.js';
import type { MemberCollection } from './types.js';

test('giveable: my dups that they are missing', () => {
  const me = { 1: 2, 2: 3, 3: 1, 4: 0 };
  const them = { 1: 0, 2: 1, 3: 0, 4: 0 };
  // my dups are 1, 2; they are missing 1; so I can give them 1 (only).
  assert.deepEqual(giveable(me, them), [1]);
});

test('giveable: ignores stickers I only own once', () => {
  const me = { 1: 1, 2: 1 };
  const them = { 1: 0, 2: 0 };
  assert.deepEqual(giveable(me, them), []);
});

test('directTrade: bidirectional', () => {
  const collections: MemberCollection[] = [
    { userId: 'a', name: 'A', collection: { 1: 2, 2: 1 } },
    { userId: 'b', name: 'B', collection: { 1: 0, 2: 2 } },
  ];
  const r = directTrade('a', 'b', collections);
  assert.deepEqual(r.iCanGive, [1]);
  assert.deepEqual(r.theyCanGive, [2]);
});

test('optimizeTrades: balanced minimum', () => {
  const collections: MemberCollection[] = [
    { userId: 'a', name: 'A', collection: { 1: 3, 2: 3, 3: 3, 10: 0, 11: 0 } },
    { userId: 'b', name: 'B', collection: { 1: 0, 2: 0, 3: 0, 10: 2, 11: 2 } },
  ];
  const r = optimizeTrades(collections, 'a');
  assert.equal(r.length, 1);
  const t = r[0]!;
  // a can give 3, b can give 2 — balanced to 2.
  assert.equal(t.count, 2);
  assert.deepEqual(t.aGives.length, 2);
  assert.deepEqual(t.bGives.length, 2);
  assert.equal(t.involvesMe, true);
});

test('optimizeTrades: prefers higher score, surfaces user trades', () => {
  // a-b can swap 1, a-c can swap 3, b-c can swap 2
  const collections: MemberCollection[] = [
    { userId: 'a', name: 'A', collection: { 1: 2, 10: 0, 20: 2, 21: 2, 22: 2, 30: 0, 31: 0 } },
    { userId: 'b', name: 'B', collection: { 1: 0, 10: 2, 30: 2, 31: 2, 32: 2 } },
    { userId: 'c', name: 'C', collection: { 20: 0, 21: 0, 22: 0, 32: 0 } },
  ];
  const r = optimizeTrades(collections, 'a');
  // a-c (3 each) involves me; a-b (1 each) involves me; b-c (2 each) does not involve me.
  // Order: my trades first by score desc, then non-my trades by score desc.
  assert.ok(r.length >= 2);
  assert.equal(r[0]!.involvesMe, true);
  assert.equal(r[0]!.count, 3); // a-c
});

test('optimizeTrades: drops zero-balanced pairs', () => {
  const collections: MemberCollection[] = [
    { userId: 'a', name: 'A', collection: { 1: 2 } },
    // b doesn't have any dups, so pair has 0 balanced.
    { userId: 'b', name: 'B', collection: { 1: 0, 2: 1 } },
  ];
  const r = optimizeTrades(collections, 'a');
  assert.equal(r.length, 0);
});
