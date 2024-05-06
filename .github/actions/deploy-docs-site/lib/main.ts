import core from '@actions/core';
import {context} from '@actions/github';
import {deployToFirebase, setupRedirect} from './deploy';
import {getDeployments} from './deployments';
import {writeCredentialFile} from './credential';

const refMatcher = /refs\/heads\/(.*)/;

async function deployDocs() {
  if (context.eventName !== 'push') {
    throw Error();
  }
  const matchedRef = context.ref.match(refMatcher);
  if (matchedRef === null) {
    throw Error();
  }

  const currentBranch = matchedRef[1];
  const configPath = core.getInput('firebase-config-path');
  const distDir = core.getInput('firebase-dist-dir');

  const deployment = (await getDeployments()).get(currentBranch) || {
    branch: 'angular-dev-release',
    destination: 'v18-angular-dev',
    redirect: {from: 'next-angular-dev', to: 'https://angular.io'},
  };

  if (deployment === undefined) {
    console.log(`Current branch (${currentBranch}) does not deploy a documentation site.`);
    console.log(`Exiting...`);
    process.exit(1);
  }

  writeCredentialFile(core.getInput('firebase-service-key', {required: true}));

  console.log('Doc site deployment information');
  console.log('');
  console.log('Current Branch:');
  console.log(`  ${deployment.branch}`);
  console.log('');
  console.log('Firebase Site:');
  if (deployment.destination === undefined) {
    console.log('  No deployment of a documenation site is necessary');
  } else {
    console.log(`  Deploying to: ${deployment.destination}`);
  }
  console.log('');
  console.log('Redirect Configuration:');
  if (deployment.redirect === undefined) {
    console.log('  No redirects are necessary');
  } else {
    console.log(`  From: ${deployment.redirect.from}`);
    console.log(`  To: ${deployment.redirect.to}`);
  }

  await deployToFirebase(deployment, configPath, distDir), await setupRedirect(deployment);
}

// Only run if the action is executed in a repository with is in the Angular org. This is in place
// to prevent the action from actually running in a fork of a repository with this action set up.
if (context.repo.owner === 'angular') {
  deployDocs().catch((e: Error) => {
    console.error(e);
    core.setFailed(e.message);
  });
} else {
  core.warning(
    'The action was skipped as this action is only meant to run in repos belonging to the Angular organization.',
  );
}
