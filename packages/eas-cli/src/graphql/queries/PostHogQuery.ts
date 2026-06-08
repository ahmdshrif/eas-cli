import { print } from 'graphql';
import gql from 'graphql-tag';

import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { withErrorHandlingAsync } from '../client';
import {
  PostHogOrganizationConnectionData,
  PostHogOrganizationConnectionFragmentNode,
  PostHogProjectData,
  PostHogProjectFragmentNode,
} from '../types/PostHogConnection';

type PostHogOrganizationConnectionsByAccountIdQuery = {
  account: {
    byId: {
      id: string;
      posthogOrganizationConnections: PostHogOrganizationConnectionData[];
    };
  };
};

type PostHogOrganizationConnectionsByAccountIdQueryVariables = {
  accountId: string;
};

type PostHogProjectByAppIdQuery = {
  app: {
    byId: {
      id: string;
      posthogProject?: PostHogProjectData | null;
    };
  };
};

type PostHogProjectByAppIdQueryVariables = {
  appId: string;
};

export const PostHogQuery = {
  async getPostHogOrganizationConnectionsByAccountIdAsync(
    graphqlClient: ExpoGraphqlClient,
    accountId: string
  ): Promise<PostHogOrganizationConnectionData[]> {
    const data = await withErrorHandlingAsync(
      graphqlClient
        .query<
          PostHogOrganizationConnectionsByAccountIdQuery,
          PostHogOrganizationConnectionsByAccountIdQueryVariables
        >(
          gql`
            query PostHogOrganizationConnectionsByAccountId($accountId: String!) {
              account {
                byId(accountId: $accountId) {
                  id
                  posthogOrganizationConnections {
                    id
                    ...PostHogOrganizationConnectionFragment
                  }
                }
              }
            }
            ${print(PostHogOrganizationConnectionFragmentNode)}
          `,
          { accountId },
          { additionalTypenames: ['PostHogOrganizationConnection'] }
        )
        .toPromise()
    );

    return data.account.byId.posthogOrganizationConnections;
  },

  async getPostHogProjectByAppIdAsync(
    graphqlClient: ExpoGraphqlClient,
    appId: string
  ): Promise<PostHogProjectData | null> {
    const data = await withErrorHandlingAsync(
      graphqlClient
        .query<PostHogProjectByAppIdQuery, PostHogProjectByAppIdQueryVariables>(
          gql`
            query PostHogProjectByAppId($appId: String!) {
              app {
                byId(appId: $appId) {
                  id
                  posthogProject {
                    id
                    ...PostHogProjectFragment
                  }
                }
              }
            }
            ${print(PostHogOrganizationConnectionFragmentNode)}
            ${print(PostHogProjectFragmentNode)}
          `,
          { appId },
          { additionalTypenames: ['App', 'PostHogProject'] }
        )
        .toPromise()
    );

    return data.app.byId.posthogProject ?? null;
  },
};
