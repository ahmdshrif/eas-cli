import openBrowserAsync from 'better-opn';

import EasCommand from '../../../commandUtils/EasCommand';
import { getPostHogProjectDashboardUrl, logNoPostHogProject } from '../../../commandUtils/posthog';
import { PostHogQuery } from '../../../graphql/queries/PostHogQuery';
import { ora } from '../../../ora';

export default class IntegrationsPostHogDashboard extends EasCommand {
  static override description = 'open the PostHog dashboard for the linked PostHog project';

  static override contextDefinition = {
    ...this.ContextOptions.ProjectConfig,
  };

  async runAsync(): Promise<void> {
    const {
      privateProjectConfig: { projectId, exp },
      loggedIn: { graphqlClient },
    } = await this.getContextAsync(IntegrationsPostHogDashboard, {
      nonInteractive: false,
      withServerSideEnvironment: null,
    });

    const posthogProject = await PostHogQuery.getPostHogProjectByAppIdAsync(graphqlClient, projectId);

    if (!posthogProject) {
      logNoPostHogProject(exp.slug);
      return;
    }

    const dashboardUrl = getPostHogProjectDashboardUrl(posthogProject);
    const failedMessage = `Unable to open a web browser. PostHog dashboard is available at: ${dashboardUrl}`;
    const spinner = ora(`Opening ${dashboardUrl}`).start();
    try {
      const opened = await openBrowserAsync(dashboardUrl);
      if (opened) {
        spinner.succeed(`Opened ${dashboardUrl}`);
      } else {
        spinner.fail(failedMessage);
      }
    } catch (error) {
      spinner.fail(failedMessage);
      throw error;
    }
  }
}
