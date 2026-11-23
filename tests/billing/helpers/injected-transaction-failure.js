export async function withInjectedTransactionFailure(
  prisma,
  delegateName,
  methodName,
  operation,
) {
  const transaction = prisma.$transaction.bind(prisma);
  let injected = false;

  Object.defineProperty(prisma, "$transaction", {
    configurable: true,
    writable: true,
    value: (callback, options) => {
      if (typeof callback !== "function") {
        return transaction(callback, options);
      }

      return transaction(
        (tx) =>
          callback(
            new Proxy(tx, {
              get(target, property) {
                const delegate = Reflect.get(target, property, target);
                if (property !== delegateName) {
                  return typeof delegate === "function"
                    ? delegate.bind(target)
                    : delegate;
                }

                return new Proxy(delegate, {
                  get(delegateTarget, method) {
                    const value = Reflect.get(
                      delegateTarget,
                      method,
                      delegateTarget,
                    );
                    if (
                      method !== methodName ||
                      typeof value !== "function" ||
                      injected
                    ) {
                      return typeof value === "function"
                        ? value.bind(delegateTarget)
                        : value;
                    }

                    return async (...args) => {
                      await value.apply(delegateTarget, args);
                      injected = true;
                      throw new Error("BILLING_QA_INJECTED_FAILURE");
                    };
                  },
                });
              },
            }),
          ),
        options,
      );
    },
  });

  try {
    const result = await operation();
    return { result, injected };
  } finally {
    Object.defineProperty(prisma, "$transaction", {
      configurable: true,
      writable: true,
      value: transaction,
    });
  }
}
