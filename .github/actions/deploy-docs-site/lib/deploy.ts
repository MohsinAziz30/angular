import {cp, mkdtemp, readFile, rmdir, writeFile} from 'fs/promises';
import {Deployment} from './deployments';
import {join} from 'path';

import {tmpdir} from 'os';
import {spawnSync} from 'child_process';

export async function deployToFirebase(
  deployment: Deployment,
  configPath: string,
  distDirPath: string,
) {
  if (deployment.destination == undefined) {
    console.log(`No deployment necessary for docs created from: ${deployment.branch}`);
    return;
  }

  const tmpDeployDir = await mkdtemp(join(tmpdir(), 'deploy-directory'));
  const deployConfigPath = join(tmpDeployDir, 'firebase.json');

  const config = JSON.parse(await readFile(configPath, {encoding: 'utf-8'})) as {
    hosting: {public: string};
  };
  config['hosting']['public'] = './dist';

  await writeFile(deployConfigPath, JSON.stringify(config, null, 2));

  await cp(distDirPath, join(tmpDeployDir, 'dist'), {recursive: true});

  firebase(
    `target:clear --config ${deployConfigPath} --project angular-dev-site hosting angular-docs`,
    tmpDeployDir,
  );
  firebase(
    `target:apply --config ${deployConfigPath} --project angular-dev-site hosting angular-docs ${deployment.destination}`,
    tmpDeployDir,
  );
  firebase(
    `deploy --config ${deployConfigPath} --project angular-dev-site --only hosting --non-interactive`,
    tmpDeployDir,
  );
  firebase(
    `target:clear --config ${deployConfigPath} --project angular-dev-site hosting angular-docs`,
    tmpDeployDir,
  );

  await rmdir(tmpDeployDir);
}

export async function setupRedirect(deployment: Deployment) {
  if (deployment.redirect === undefined) {
    console.log(`No redirect necessary for docs created from: ${deployment.branch}`);
    return;
  }

  const redirectConfig = JSON.stringify(
    {
      hosting: {
        target: 'angular-docs',
        redirects: [
          {
            type: 302,
            regex: '^(.*)$',
            destination: `${deployment.redirect.to}:1`,
          },
        ],
      },
    },
    null,
    2,
  );

  const tmpRedirectDir = await mkdtemp(join(tmpdir(), 'redirect-directory'));
  const redirectConfigPath = join(tmpRedirectDir, 'firebase.json');

  await writeFile(redirectConfigPath, redirectConfig);

  firebase(
    `target:clear --config ${redirectConfigPath} --project angular-dev-site hosting angular-docs`,
    tmpRedirectDir,
  );
  firebase(
    `target:apply --config ${redirectConfigPath} --project angular-dev-site hosting angular-docs ${deployment.redirect.from}`,
    tmpRedirectDir,
  );
  firebase(
    `deploy --config ${redirectConfigPath} --project angular-dev-site --only hosting --non-interactive`,
    tmpRedirectDir,
  );
  firebase(
    `target:clear --config ${redirectConfigPath} --project angular-dev-site hosting angular-docs`,
    tmpRedirectDir,
  );

  await rmdir(tmpRedirectDir);
}

function firebase(cmd: string, cwd?: string) {
  spawnSync('npx', `-y firebase-tools@latest --debug ${cmd}`.split(' '), {
    cwd,
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
}
