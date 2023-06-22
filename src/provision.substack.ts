import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import substacks from './substacks';

export const provisionSubstack = substacks.register(async function provision() {
  // pretend to provision some cloud resources
  // this will not run as often as other steps
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

  const k8sProvider: k8s.ProviderArgs = {
    kubeconfig: 'some config',
  };
  const dockerRegistry: docker.types.input.Registry = {
    server: pulumi.output('some host'),
    username: pulumi.output('username'),
    password: pulumi.secret('password'),
  };

  return {
    k8sProvider,
    dockerRegistry,
  };
});
