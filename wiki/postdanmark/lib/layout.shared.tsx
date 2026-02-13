import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const GITHUB_REPO = 'https://github.com/Mercantec-GHC/h4-26-gruppe1o-postdanmark';

export const gitConfig = {
  user: 'Mercantec-GHC',
  repo: 'h4-26-gruppe1o-postdanmark',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Post Danmark Wiki',
    },
    githubUrl: GITHUB_REPO,
    links: [],
  };
}
