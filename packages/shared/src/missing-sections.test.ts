import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  groupMissingBySection,
  stickerPositionLabel,
  parseStickerToken,
  TEAM_CODES,
} from './stickers.js';

test('stickerPositionLabel: foil, FWC block, teams', () => {
  assert.equal(stickerPositionLabel(1), '00'); // Panini foil
  assert.equal(stickerPositionLabel(2), '1'); // FWC1
  assert.equal(stickerPositionLabel(20), '19'); // FWC19 (last museum sticker)
  assert.equal(stickerPositionLabel(21), '1'); // MEX1 (first team sticker)
  assert.equal(stickerPositionLabel(40), '20'); // MEX20
  assert.equal(stickerPositionLabel(980), '20'); // PAN20
});

test('groupMissingBySection: FWC block merges opening + museum under one heading', () => {
  // #1 (00), #2 (FWC1), #20 (FWC19) all collapse into a single FWC section.
  const sections = groupMissingBySection([1, 2, 20]);
  assert.equal(sections.length, 1);
  assert.equal(sections[0]!.code, 'FWC');
  assert.equal(sections[0]!.teamIndex, null);
  assert.deepEqual(sections[0]!.positions, ['00', '1', '19']);
});

test('groupMissingBySection: keeps album order and resolves team index', () => {
  // POR is album index 40 (0-based). POR1 = 821, POR3 = 823.
  const por1 = parseStickerToken('POR1')!;
  const por3 = parseStickerToken('POR3')!;
  const mex1 = parseStickerToken('MEX1')!;
  // Feed unsorted to prove it sorts by album order (MEX before POR).
  const sections = groupMissingBySection([por3, mex1, por1]);
  assert.deepEqual(
    sections.map((s) => s.code),
    ['MEX', 'POR'],
  );
  const por = sections.find((s) => s.code === 'POR')!;
  assert.equal(por.teamIndex, TEAM_CODES.indexOf('POR'));
  assert.deepEqual(por.positions, ['1', '3']);
});

test('groupMissingBySection: de-dupes and ignores out-of-range numbers', () => {
  const sections = groupMissingBySection([21, 21, 0, 981, -5]);
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0]!.positions, ['1']);
});

test('groupMissingBySection: empty input yields no sections', () => {
  assert.deepEqual(groupMissingBySection([]), []);
});
