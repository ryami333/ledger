/**
 * The release-it configuration (PLAN.md, D12). `yarn release` bumps the
 * version of the root package.json, commits it, makes the tag `v<version>`,
 * pushes, and makes a GitHub release. The tag starts the workflow
 * `.github/workflows/docker-publish.yaml`, which publishes the image.
 *
 * Before the release, the hooks run the checks. `yarn db:test` needs Docker,
 * because it runs the pgTAP tests in the local stack (compose.yaml).
 *
 * The workspaces keep their own versions. Only the root version is the
 * version of a release.
 */
export default {
  git: {
    commitMessage: "release: v${version}",
    tagName: "v${version}",
    requireCleanWorkingDir: true,
    requireUpstream: true,
    requireBranch: "main",
    tag: true,
    commit: true,
  },
  github: {
    release: true,
  },
  npm: {
    publish: false,
  },
  hooks: {
    "before:init": ["yarn lint", "yarn test", "yarn db:test", "yarn build"],
  },
};
