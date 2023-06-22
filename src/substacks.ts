import { StackReference, Unwrap, getStack } from '@pulumi/pulumi';

type KeyValue<Data = any> = { [key: string]: Data; };
type Keys<T> = T extends {} ? Extract<keyof T, string> : never;
type PromiseOr<T> = Promise<T> | T;

type SubstackOutput = PromiseOr<KeyValue | void>
type SubstackFn = () => SubstackOutput;

class Substacks {
  readonly stack: string;
  readonly substack?: string;

  static getNames() {
    const [stack, substack] = getStack().split('.');
    return { stack, substack };
  }

  constructor(readonly substacks: KeyValue<SubstackFn> = {}) {
    const { stack, substack } = Substacks.getNames();
    this.stack = stack;
    this.substack = substack;
  }

  register<
    Fn extends SubstackFn,
  >(fn: Fn, name = fn.name) {
    this.substacks[name] = fn;

    return {
      getOutput: async <
        R extends Awaited<ReturnType<Fn>> = Awaited<ReturnType<Fn>>,
        K extends Keys<R> = Keys<R>,
      >(key: K): Promise<Unwrap<R[K]>> => {
        const substackRef = this.getSubstackRef(name);
        const output = await substackRef.getOutputDetails(key);
        return output?.value || output?.secretValue;
      }
    };
  }

  private substackRefs: KeyValue<StackReference> = {};
  private getSubstackRef(substack: string) {
    if (!this.substackRefs[substack]) {
      this.substackRefs[substack] = new StackReference(`${this.stack}.${substack}`);
    }
    return this.substackRefs[substack];
  }

  async run() {
    if (!this.substack) {
      // this is the root stack, ran by `pulumi up` instead of the `substack` script
      // anything could be done here
      // here we proxy all outputs from substacks for example
      const allOutputs = {} as KeyValue;
      for (const substack of Object.keys(this.substacks)) {
        const substackRef = this.getSubstackRef(substack);
        allOutputs[substack] = substackRef.outputs;
      }
      return allOutputs;
    };

    return await this.substacks[this.substack]();
  }
}

export default new Substacks();
