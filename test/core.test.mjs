import test from 'node:test';
import assert from 'node:assert/strict';
import { stableNumericId, parseEpisodeTitle, CatalogStore } from '../src/catalog.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('stable ids are deterministic and positive', () => {
  const a = stableNumericId('source', 'abc');
  assert.equal(a, stableNumericId('source', 'abc'));
  assert.ok(a > 0);
  assert.notEqual(a, stableNumericId('source', 'xyz'));
});

test('episode parser handles SxxExx and season episode styles', () => {
  assert.deepEqual(parseEpisodeTitle('Open Show S02E07 The Return'), { seriesTitle: 'Open Show', season: 2, episode: 7, episodeTitle: 'The Return' });
  const second = parseEpisodeTitle('Archive Series - Season 3 Episode 4 - Demo');
  assert.equal(second.seriesTitle, 'Archive Series');
  assert.equal(second.season, 3);
  assert.equal(second.episode, 4);
});

test('catalog reuses derived indexes until content changes', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'blofy-cache-'));
  try {
    const store = await new CatalogStore({ dataDir: dir }).init();
    store.replaceSource('one', [
      { sourceItemId: 'e1', kind: 'series_episode', title: 'Ep 1', seriesTitle: 'Cached Show', season: 1, episode: 1, category: 'Series' },
      { sourceItemId: 'm1', kind: 'movie', title: 'Movie 1', category: 'Films' }
    ]);
    const groups1=store.seriesGroups(),groups2=store.seriesGroups(),stats1=store.stats(),stats2=store.stats(),cats1=store.categoryRecords('movie'),cats2=store.categoryRecords('movie');
    assert.equal(groups1,groups2);assert.equal(stats1,stats2);assert.equal(cats1,cats2);
    store.replaceSource('one', [{ sourceItemId: 'm2', kind: 'movie', title: 'Movie 2', category: 'New Films' }]);
    assert.notEqual(store.seriesGroups(),groups1);assert.notEqual(store.stats(),stats1);assert.notEqual(store.categoryRecords('movie'),cats1);
    assert.equal(store.stats().movies,1);assert.equal(store.stats().episodes,0);assert.equal(store.categoryRecords('movie')[0].name,'New Films');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('catalog groups series episodes and persists', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'blofy-catalog-'));
  try {
    const store = await new CatalogStore({ dataDir: dir }).init();
    store.replaceSource('test', [
      { sourceItemId: 'a', kind: 'series_episode', title: 'Ep 1', seriesTitle: 'Demo', season: 1, episode: 1, category: 'Test' },
      { sourceItemId: 'b', kind: 'series_episode', title: 'Ep 2', seriesTitle: 'Demo', season: 1, episode: 2, category: 'Test' },
      { sourceItemId: 'm', kind: 'movie', title: 'Movie', category: 'Films' }
    ]);
    store.finishSync();
    await store.persist();
    assert.equal(store.seriesGroups().length, 1);
    assert.equal(store.stats().episodes, 2);
    const loaded = await new CatalogStore({ dataDir: dir }).init();
    assert.equal(loaded.stats().movies, 1);
    assert.equal(loaded.seriesGroups()[0].episodes.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
