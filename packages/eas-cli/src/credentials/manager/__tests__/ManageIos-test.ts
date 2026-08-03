import { Platform } from '@expo/eas-build-job';
import { BuildProfile } from '@expo/eas-json';

import { IosActionType } from '../Actions';
import { Action } from '../HelperActions';
import { ManageIos } from '../ManageIos';
import { CredentialsContext } from '../../context';
import { getAppLookupParamsFromContextAsync } from '../../ios/actions/BuildCredentialsUtils';
import { SetUpPushKey } from '../../ios/actions/SetUpPushKey';
import { App, Target } from '../../ios/types';
import { jester } from '../../__tests__/fixtures-constants';

jest.mock('../../ios/actions/BuildCredentialsUtils');
jest.mock('../../ios/actions/SetUpPushKey');

class TestManageIos extends ManageIos {
  public async callRunProjectSpecificActionAsync(
    ctx: CredentialsContext,
    app: App,
    targets: Target[],
    buildProfile: BuildProfile<Platform.IOS>,
    action: IosActionType
  ): Promise<void> {
    await this.runProjectSpecificActionAsync(ctx, app, targets, buildProfile, action);
  }
}

describe('runProjectSpecificActionAsync', () => {
  const app: App = { account: jester.accounts[0], projectName: 'project' };
  const targets: Target[] = [
    { targetName: 'target', bundleIdentifier: 'com.expo.test', entitlements: {} },
  ];
  // The documented dev-client pattern: internal distribution that also targets the simulator.
  const simulatorBuildProfile = {
    distribution: 'internal',
    simulator: true,
  } as BuildProfile<Platform.IOS>;

  const manageIos = new TestManageIos({} as Action, '');
  const ctx = {} as CredentialsContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppLookupParamsFromContextAsync).mockResolvedValue({
      account: app.account,
      projectName: app.projectName,
      bundleIdentifier: targets[0].bundleIdentifier,
    } as never);
  });

  it('sets up a push key for a build profile with "ios.simulator": true', async () => {
    jest.mocked(SetUpPushKey).mockImplementation(
      () =>
        ({
          isPushKeySetupAsync: jest.fn().mockResolvedValue(false),
          runAsync: jest.fn().mockResolvedValue(null),
        }) as never
    );

    await expect(
      manageIos.callRunProjectSpecificActionAsync(
        ctx,
        app,
        targets,
        simulatorBuildProfile,
        IosActionType.SetUpPushKey
      )
    ).resolves.not.toThrow();

    expect(SetUpPushKey).toHaveBeenCalled();
  });

  it('still refuses build credential actions for a build profile with "ios.simulator": true', async () => {
    await expect(
      manageIos.callRunProjectSpecificActionAsync(
        ctx,
        app,
        targets,
        simulatorBuildProfile,
        IosActionType.RemoveProvisioningProfile
      )
    ).rejects.toThrow('A simulator distribution does not require credentials to be configured.');
  });
});
