import { PassThrough } from 'stream';

import { getMockWorkflowRunWithJobsFragment } from '../../../__tests__/commands/utils';
import { fetchRawLogsForCustomJobAsync } from '../fetchLogs';
import { infoForActiveWorkflowRunAsync, maybeReadStdinAsync } from '../utils';
import { WorkflowJobStatus } from '../../../graphql/generated';

jest.mock('../fetchLogs');

describe('workflow utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows the display name for the current step while keying logs by step id', async () => {
    const workflowRun = getMockWorkflowRunWithJobsFragment();
    workflowRun.jobs = workflowRun.jobs.map(job => ({
      ...job,
      status: WorkflowJobStatus.InProgress,
    }));

    jest
      .mocked(fetchRawLogsForCustomJobAsync)
      .mockResolvedValue(
        [
          '{"buildStepId":"step-id-1","buildStepDisplayName":"Install dependencies","time":"2022-01-01T00:00:00.000Z","msg":"npm ci"}',
          '{"buildStepId":"step-id-1","buildStepDisplayName":"Install dependencies","marker":"end-step","result":"success","time":"2022-01-01T00:00:01.000Z","msg":"done"}',
        ].join('\n')
      );

    const output = await infoForActiveWorkflowRunAsync({} as any, workflowRun);

    expect(output).toContain('Current step');
    expect(output).toContain('Install dependencies');
    expect(output).not.toContain('step-id-1');
  });
});

describe(maybeReadStdinAsync, () => {
  const originalStdin = Object.getOwnPropertyDescriptor(process, 'stdin')!;

  function useStdin(stream: NodeJS.ReadableStream): void {
    Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
  }

  /** Let the stream machinery emit its pending events, which use `process.nextTick`. */
  async function flushStreamEventsAsync(): Promise<void> {
    await new Promise(resolve => process.nextTick(resolve));
  }

  afterEach(() => {
    Object.defineProperty(process, 'stdin', originalStdin);
    jest.useRealTimers();
  });

  test('returns null without reading when stdin is a TTY', async () => {
    const stdin = new PassThrough();
    useStdin(Object.assign(stdin, { isTTY: true }));

    await expect(maybeReadStdinAsync()).resolves.toBeNull();
  });

  test('returns null when stdin has already ended', async () => {
    const stdin = new PassThrough();
    stdin.end();
    stdin.resume();
    await flushStreamEventsAsync();
    useStdin(stdin);

    await expect(maybeReadStdinAsync()).resolves.toBeNull();
  });

  test('returns the piped data once stdin ends', async () => {
    const stdin = new PassThrough();
    useStdin(stdin);

    const promise = maybeReadStdinAsync();
    stdin.write('{"input":"value"}\n');
    stdin.end();

    await expect(promise).resolves.toBe('{"input":"value"}');
  });

  test('returns null when stdin is an open pipe that never emits end', async () => {
    // Leave the stream machinery on real scheduling, only the timeout is faked.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const stdin = new PassThrough();
    useStdin(stdin);

    const promise = maybeReadStdinAsync();
    // The pipe stays open and silent, as it does on CI agents that inherit stdin from the runner.
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeNull();
  });

  test('waits for all input when the pipe stays open long after the first chunk', async () => {
    // Leave the stream machinery on real scheduling, only the timeout is faked.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const stdin = new PassThrough();
    useStdin(stdin);

    const promise = maybeReadStdinAsync();
    stdin.write('{"input":"value"}');
    await flushStreamEventsAsync();
    await jest.advanceTimersByTimeAsync(60_000);
    jest.useRealTimers();
    stdin.end();

    await expect(promise).resolves.toBe('{"input":"value"}');
  });
});
