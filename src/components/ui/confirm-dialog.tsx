import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Info-only dialog: a single button. */
  alert?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Imperative confirm: `if (await confirm({...})) doThing()`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; options: ConfirmOptions }>({
    open: false,
    options: { title: "" },
  });
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback<ConfirmFn>((options) => {
    setState({ open: true, options });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    resolver.current(result);
    setState((s) => ({ ...s, open: false }));
  }

  const { open, options } = state;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={open} size="sm" title={options.title} onClose={() => settle(false)}>
        <div className="space-y-5">
          {options.message ? (
            <p className="text-[13px] leading-relaxed text-ink-soft">{options.message}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            {options.alert ? null : (
              <Button onClick={() => settle(false)}>{options.cancelLabel ?? "Huỷ"}</Button>
            )}
            <Button
              autoFocus
              variant={options.danger ? "danger" : "primary"}
              onClick={() => settle(true)}
            >
              {options.confirmLabel ?? "Xác nhận"}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
