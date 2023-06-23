# Description
Example of pulumi [micro-stacks](https://www.pulumi.com/docs/using-pulumi/organizing-projects-stacks/#micro-stacks) approach implementation with typescript. The Kubernetes-based infrastructure is considered here, but the approach could be applied to any stack that needs to be run in multiple steps.

### Motivation
As described in [this pulumi blog post](https://www.pulumi.com/blog/micro-stacks-organizing-pulumi-programs/), we could achieve the micro-stacks approach by creating separate pulumi projects. This looks cool at first glance, but it has some drawbacks:
- We need to `cd ./project1 && pulumi up && cd ../project2 && pulumi up ...` all the time
- We need to configure the `tsconfig.json` (and other tools) for each project in the monorepo and manage path aliases to import the output types 
- Or instead, we need to hardcode the output types every time we want to reference them with `StackReference`

This results in a growing complexity of the project and/or a lot of copy-paste.
Instead what we can do is create a single project/stack and split the stack's program into multiple steps. This would eliminate the drawbacks mentioned above while keeping the benefits of the micro-stacks approach.
**But there is a catch.** 
The pulumi CLI doesn't support this approach out of the box. Also, you can not pass some arguments to the program like usual `node ./index.js build` to get the arg from `process.argv` and know that this `pulumi up` should only run the build step.
The Automation API could be used to solve this, but this would make things too complex and take all the benefits of the pulumi CLI away. So reinventing the CLI is not an option.

### Solution
Pulumi stack names may contain alphanumeric characters, hyphens, underscores, and periods. We'll use this to add another level of project scoping: substacks. 
Substack is a usual pulumi stack that is created from the main stack name by adding a period and substack name, for example: `example.substack1` and `example.substack2` are substacks of the `example` stack.
As we can get the current stack name in the program, we can use it to determine which substack we want to run. The usual `pulumi up` then transforms to `pulumi --stack example.substack1 up`.
To run only a subset of the program pulumi allows to [programmatically set the entrypoint](https://www.pulumi.com/docs/languages-sdks/javascript/#entrypoint) like this: 
```typescript
export = async () => {
    // create resources
    return { out: myResource.output };
}
```
So the basic idea is to do something like this:
```typescript
const [stack, substack] = pulumi.getStack().split('.');

const substack1 = async () => {
  return substack1Output;
}
const substack2 = async () => {
  const substack1Ref = new StackReference(`${this.stack}.substack1`);
  const substack1Output = (await substack1Ref.getOutputDetails('key')).value as pulumi.Unwrap<ReturnType<typeof stack1>>['key'];

  return substack2Output;
}
const currentSubstack = substack === 'substack1' ? substack1 : substack2;
export = currentSubstack;
```
Of course, we don't want to write this boilerplate code every time. Instead, we can create some utility functions to do this for us. One of the possible implementations is in the `./src/substacks.ts` file.
It's a singleton registry for substacks. It allows us to register named substacks and run them by name. Also the `Substacks.register` returns a container of the substack reference, allowing us to get typed outputs from other substacks. 
For the usage example see `./src/index.ts`. What it does is requires every substack file to make them register themselves and create the stack references. Then it calls the `Substacks.run` to decide which stack to run.
*The substacks in this example are not intended to actually create any resources, these are just usage examples and POC for the DRY types.* That said, let's look at the `./src/build.substack.ts`. It uses the `provision` substack reference to get some docker registry credentials, then creates an image and exports its `repoDigest` for the `deploy` substack to use in the same way.

That's it for the program. But we still need to run some long commands to get it working. To make it easier there is a simple bash script `./substack.bash` that accepts the substack name and the rest of the arguments to pass to the pulumi CLI. It gets the current stack name, joins it with the substack name, and passes the rest to pulumi. To make it a bit easier to use, we can create an alias (see the setup section). Now we can create a stack as usual, and manage the substacks with `substack <substack-name> <pulumi-args>`

### Results
- A pulumi stack is managed as usual, but the program is split into multiple steps that can be run separately.
- The advantages of the micro-stacks are kept while the code is DRY and easy to maintain.
#### Personal impression
- Previously I had to wait more than 2 minutes for `pulumi up` to complete after each tweak in the infrastructure configurations because it needed to build a lot of docker images and recheck other things even when I'm sure that nothing changed from the previous run. This was very time-consuming and annoying. Now I can skip the entire build step and make progress much faster. 
- The deploy step sometimes was deciding to replace some k8s deployments and wait for the build to complete before creating the replacement, which caused unnecessary downtime. Now I can build images ahead of time and then deploy them as a separate step, so the downtime is minimized.
- There is a trick in building the images. The stack reference allows getting the previous outputs from the same substack, so I have more control over the build process: instead of building everything every time, I only build an image if its tag is changed.

## Test
### Prerequisites
- Pulumi v3.72.2
- NodeJS v18.14.2
- TypeScript v5.1.3
- Bash

### Setup
```bash
yarn
tsc
chmod +x ./substack.bash
alias substack=./substack.bash
```

### Usage example
```bash
pulumi stack init example
substack provision up
substack build up
substack deploy up
```
