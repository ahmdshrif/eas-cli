import { App, Session, User } from '@expo/apple-utils';
import { Platform } from '@expo/eas-build-job';

import { getRequestContext } from '../../../credentials/ios/appstore/authenticate';
import {
  ensureAppExistsAsync,
  ensureBundleIdExistsWithNameAsync,
} from '../../../credentials/ios/appstore/ensureAppExists';
import { ensureTestFlightGroupExistsAsync } from '../../../credentials/ios/appstore/ensureTestFlightGroup';
import { SubmissionContext } from '../../context';
import { ensureAppStoreConnectAppExistsAsync } from '../AppProduce';

jest.mock('@expo/apple-utils', () => ({
  ...jest.requireActual('@expo/apple-utils'),
  Session: { getAnySessionInfo: jest.fn() },
  User: { getAsync: jest.fn() },
}));
jest.mock('../../../credentials/ios/appstore/authenticate', () => ({
  getRequestContext: jest.fn(),
}));
jest.mock('../../../credentials/ios/appstore/ensureAppExists', () => ({
  ensureAppExistsAsync: jest.fn(),
  ensureBundleIdExistsWithNameAsync: jest.fn(),
}));
jest.mock('../../../credentials/ios/appstore/ensureTestFlightGroup', () => ({
  ensureTestFlightGroupExistsAsync: jest.fn(),
}));
jest.mock('../../../log');

function createContext({
  nonInteractive = false,
  autoTestFlightSetup = true,
}: {
  nonInteractive?: boolean;
  autoTestFlightSetup?: boolean;
} = {}): SubmissionContext<Platform.IOS> {
  return {
    nonInteractive,
    autoTestFlightSetup,
    applicationIdentifierOverride: 'com.example.app',
    exp: { name: 'Example' },
    profile: { appName: 'Example' },
    projectDir: '/app',
    credentialsCtx: {
      appStore: {
        ensureUserAuthenticatedAsync: jest.fn(async () => ({ appleId: 'test@example.com' })),
      },
    },
  } as unknown as SubmissionContext<Platform.IOS>;
}

describe(ensureAppStoreConnectAppExistsAsync, () => {
  beforeEach(() => {
    jest
      .mocked(getRequestContext)
      .mockReset()
      .mockReturnValue({} as any);
    jest
      .mocked(Session.getAnySessionInfo)
      .mockReset()
      .mockReturnValue(null as any);
    jest
      .mocked(User.getAsync)
      .mockReset()
      .mockResolvedValue([{ attributes: { provisioningAllowed: true } }] as unknown as User[]);
    jest
      .mocked(ensureBundleIdExistsWithNameAsync)
      .mockReset()
      .mockResolvedValue(undefined as any);
    jest
      .mocked(ensureAppExistsAsync)
      .mockReset()
      .mockResolvedValue({ id: '12345678' } as App);
    jest.mocked(ensureTestFlightGroupExistsAsync).mockReset().mockResolvedValue(undefined);
  });

  it('sets up the internal TestFlight group by default', async () => {
    const ctx = createContext();

    const { ascAppIdentifier } = await ensureAppStoreConnectAppExistsAsync(ctx);

    expect(ascAppIdentifier).toBe('12345678');
    expect(ensureTestFlightGroupExistsAsync).toHaveBeenCalledWith(expect.anything(), {
      nonInteractive: false,
    });
  });

  it('skips the internal TestFlight group when automatic setup is disabled', async () => {
    const ctx = createContext({ autoTestFlightSetup: false });

    const { ascAppIdentifier } = await ensureAppStoreConnectAppExistsAsync(ctx);

    expect(ascAppIdentifier).toBe('12345678');
    expect(ensureTestFlightGroupExistsAsync).not.toHaveBeenCalled();
  });

  it('still resolves the app when the TestFlight group setup fails', async () => {
    jest
      .mocked(ensureTestFlightGroupExistsAsync)
      .mockRejectedValue(new Error('App Store Connect is unavailable'));
    const ctx = createContext();

    const { ascAppIdentifier } = await ensureAppStoreConnectAppExistsAsync(ctx);

    expect(ascAppIdentifier).toBe('12345678');
  });
});
