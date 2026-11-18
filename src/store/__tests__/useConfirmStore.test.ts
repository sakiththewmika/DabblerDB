import { beforeEach, describe, expect, it } from 'vitest';
import { confirmDialog, useConfirmStore } from '../useConfirmStore';

const options = { title: 'Reset?', message: 'Everything is replaced.', confirmLabel: 'Reset' };

beforeEach(() => useConfirmStore.setState({ request: null }));

describe('confirmDialog', () => {
  it('shows the question and resolves to true when confirmed', async () => {
    const result = confirmDialog(options);
    expect(useConfirmStore.getState().request?.title).toBe('Reset?');
    useConfirmStore.getState().answer(true);
    await expect(result).resolves.toBe(true);
    expect(useConfirmStore.getState().request).toBeNull();
  });

  it('resolves to false when cancelled', async () => {
    const result = confirmDialog(options);
    useConfirmStore.getState().answer(false);
    await expect(result).resolves.toBe(false);
  });

  it('counts a replaced, unanswered question as "no"', async () => {
    const first = confirmDialog(options);
    const second = confirmDialog({ ...options, title: 'Open shared schema?' });
    await expect(first).resolves.toBe(false);
    expect(useConfirmStore.getState().request?.title).toBe('Open shared schema?');
    useConfirmStore.getState().answer(true);
    await expect(second).resolves.toBe(true);
  });
});
