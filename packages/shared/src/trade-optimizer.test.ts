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
  // A has a duplicate of #1 and is missing #2; B is missing #1 and has a
  // duplicate of #2. giveable only offers stickers the receiver is *missing*,
  // so each side can give the other exactly one.
  const collections: MemberCollection[] = [
    { userId: 'a', name: 'A', collection: { 1: 2, 2: 0 } },
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
  // Three-way group where each pair can make a balanced swap:
  //   a-c: 3 each (involves me, highest score)
  //   b-c: 2 each (does NOT involve me)
  //   a-b: 1 each (involves me)
  // giveable only counts a giver's duplicates the receiver is *missing*, so each
  // member owns single copies of the other pairs' gifts to keep the counts
  // independent (a missing X = X flows in; a owning X = blocks that flow).
  const collections: MemberCollection[] = [
    {
      userId: 'a',
      name: 'A',
      collection: {
        201: 2,
        202: 2,
        203: 2, // a → c (3)
        211: 2, //                 a → b (1)
        221: 1,
        222: 1, //         owns: blocks b → a
        301: 0,
        302: 0,
        303: 0, // missing: receives from c
        311: 0, //                 missing: receives from b
        321: 1,
        322: 1, //         owns: blocks c → a
      },
    },
    {
      userId: 'b',
      name: 'B',
      collection: {
        311: 2, //                 b → a (1)
        221: 2,
        222: 2, //         b → c (2)
        211: 0, //                 missing: receives from a
        201: 1,
        202: 1,
        203: 1, // owns: blocks a → b
        301: 1,
        302: 1,
        303: 1, // owns: blocks c → b
        321: 0,
        322: 0, //         missing: receives from c
      },
    },
    {
      userId: 'c',
      name: 'C',
      collection: {
        301: 2,
        302: 2,
        303: 2, // c → a (3)
        321: 2,
        322: 2, //         c → b (2)
        201: 0,
        202: 0,
        203: 0, // missing: receives from a
        221: 0,
        222: 0, //         missing: receives from b
        211: 1, //                 owns: blocks a → c
        311: 1, //                 owns: blocks b → c
      },
    },
  ];
  const r = optimizeTrades(collections, 'a');
  // Order: my trades first by score desc (a-c=3, a-b=1), then non-my trades (b-c=2).
  assert.equal(r.length, 3);
  assert.equal(r[0]!.involvesMe, true);
  assert.equal(r[0]!.count, 3); // a-c
  assert.equal(r[1]!.count, 1); // a-b (also mine)
  assert.equal(r[2]!.involvesMe, false); // b-c surfaces after my trades
  assert.equal(r[2]!.count, 2);
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
