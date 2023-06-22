import * as k8s from '@pulumi/kubernetes';
import substacks from './substacks';
import { provisionSubstack } from './provision.substack';
import { buildSubstack } from './build.substack';

export const deploySubstack = substacks.register(async function deploy() {
  const { kubeconfig } = await provisionSubstack.getOutput('k8sProvider');
  const provider = new k8s.Provider('k8s-provider', { kubeconfig });

  const image = await buildSubstack.getOutput('imageDigest');
  const pod = new k8s.core.v1.Pod('some-pod', {
    spec: {
      containers: [{
        name: 'some-container',
        image,
      }],
    }
  }, {
    provider,
  });

  return {
    podName: pod.metadata.name,
    podStatus: pod.status,
  };
});
