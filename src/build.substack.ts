import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import substacks from './substacks';
import { provisionSubstack } from './provision.substack';

export const buildSubstack = substacks.register(async function build(): Promise<{
  imageVersion: string;
  imageDigest: docker.Image['repoDigest'];
}> {
  const imageVersion = getVersionSomehow();
  const previousImageVersion = await buildSubstack.getOutput('imageVersion');
  const previousImageDigest = await buildSubstack.getOutput('imageDigest');
  if (previousImageDigest && imageVersion === previousImageVersion) {
    // skip the build by returning the previous outputs with the same type
    return {
      imageVersion,
      imageDigest: pulumi.output(previousImageDigest),
    }
  }

  // pretend to build some docker.Image's for example
  // which would take to long to run in a single stack
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

  const registry = await provisionSubstack.getOutput('dockerRegistry');

  const image = new docker.Image('some-image', {
    imageName: `some-image:${Date.now()}`,
    build: {
      dockerfile: `${process.cwd()}/Dockerfile`,
    },
    registry,
  });

  return {
    imageVersion,
    imageDigest: image.repoDigest
  };
});

function getVersionSomehow() {
  return '1.0.0'
}