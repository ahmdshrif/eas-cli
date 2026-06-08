import { Flags } from '@oclif/core';
import chalk from 'chalk';

import EasCommand from '../../../commandUtils/EasCommand';
import { EASNonInteractiveFlag } from '../../../commandUtils/flags';
import {
  formatPostHogProject,
  getPostHogProjectDashboardUrl,
  logNoPostHogProject,
} from '../../../commandUtils/posthog';
import { PostHogMutation } from '../../../graphql/mutations/PostHogMutation';
import { PostHogQuery } from '../../../graphql/queries/PostHogQuery';
import Log, { link } from '../../../log';
import { ora } from '../../../ora';
import { confirmAsync } from '../../../prompts';

export default class IntegrationsPostHogDisconnect extends EasCommand {
  static override description =
    'remove the PostHog project link for the current Expo app from EAS servers';

  static override flags = {
    ...EASNonInteractiveFlag,
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  };

  static override contextDefinition = {
    ...this.ContextOptions.ProjectConfig,
  };

  async runAsync(): Promise<void> {
    const {
      flags: { 'non-interactive': nonInteractive, yes },
    } = await this.parse(IntegrationsPostHogDisconnect);

    const {
      privateProjectConfig: { projectId, exp },
      loggedIn: { graphqlClient },
    } = await this.getContextAsync(IntegrationsPostHogDisconnect, {
      nonInteractive,
      withServerSideEnvironment: null,
    });

    const posthogProject = await PostHogQuery.getPostHogProjectByAppIdAsync(graphqlClient, projectId);

    if (!posthogProject) {
      logNoPostHogProject(exp.slug);
      return;
    }

    Log.addNewLineIfNone();
    Log.log(formatPostHogProject(posthogProject));
    Log.newLine();

    const dashboardUrl = getPostHogProjectDashboardUrl(posthogProject);
    if (!nonInteractive && !yes) {
      const confirmed = await confirmAsync({
        message: `Remove this PostHog project link from EAS servers? This does not delete the project on PostHog. PostHog dashboard: ${link(
          dashboardUrl,
          { dim: false }
        )}`,
      });
      if (!confirmed) {
        Log.error('Canceled removal of the PostHog project link');
        return;
      }
    } else {
      Log.warn(
        `Removing the PostHog project link from EAS servers. This does not delete the project on PostHog: ${dashboardUrl}`
      );
    }

    const spinner = ora('Removing PostHog project link').start();
    try {
      await PostHogMutation.deletePostHogProjectAsync(graphqlClient, posthogProject.id);
      spinner.succeed(
        `Removed PostHog project ${chalk.bold(posthogProject.posthogProjectName)} from EAS servers`
      );
    } catch (error) {
      spinner.fail('Failed to remove PostHog project link');
      throw error;
    }
  }
}
