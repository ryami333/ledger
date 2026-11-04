import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  type ComponentPropsWithRef,
} from "react";
import {
  CloseButton,
  Modal as MantineModal,
  ModalStackContext,
} from "@mantine/core";
import classNames from "classnames/bind";
import styles from "./Modal.module.css";

const cx = classNames.bind(styles);

/**
 * The value of `--z-index--modal` in src/styles/tokens/z-index.css. Mantine's
 * Modal.Stack increases its base z-index only from a number, not from a CSS
 * variable. Thus this value is a number here too.
 */
const MODAL_Z_INDEX = 1600;

/** Gives the close button of `Modal.Header` the close callback of its modal. */
const RequestCloseContext = createContext<() => void>(() => {});

/**
 * The modal. It gives only the parts that all modals share: the scrim, the
 * frame, the focus trap and the return of the focus, close on Escape and on a
 * scrim click, the fade transition, and stacking.
 *
 * Mantine's full `Modal` always sets `role="dialog"` on its content, and it
 * points `aria-describedby` at the whole body. Thus this component builds the
 * modal from the compound parts of Mantine, and connects them to
 * `Modal.Stack` the same way as Mantine's full `Modal`.
 */
function Container({
  isOpen,
  onRequestClose,
  children,
  role = "dialog",
  aria,
  stackId,
  width = "default",
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /**
   * - `"dialog"`: a modal that shows information or asks for input.
   * - `"alertdialog"`: only a modal that interrupts the user to confirm an
   *   urgent or destructive action, for example a delete. Then
   *   `aria.describedby` must point to the message, and the initial focus
   *   must go to the least destructive action (set `data-autofocus` on it).
   */
  role?: "dialog" | "alertdialog";
  aria?: {
    /** Only for a modal with no `Modal.Title`. `Modal.Title` sets the label. */
    labelledby?: string;
    describedby?: string;
  };
  /**
   * A fixed, readable id, prefixed with the feature, for example
   * `"transaction-delete"`. Give it to each modal in a `Modal.Stack`.
   */
  stackId?: string;
  /**
   * - `"default"`: 480px, for a short form or a message.
   * - `"wide"`: 720px, for a modal with much content, for example an upload.
   */
  width?: "default" | "wide";
}) {
  const stack = use(ModalStackContext);
  const stackPosition =
    stack !== null && stackId !== undefined ? { stack, stackId } : null;
  const isTopOfStack =
    stackPosition === null ||
    stackPosition.stack.currentId === stackPosition.stackId;

  // The stack value changes on each render of Modal.Stack. Read it from an
  // effect event, so that the registration runs only when isOpen changes.
  const updateStackRegistration = useEffectEvent((shouldRegister: boolean) => {
    if (stackPosition === null) return;
    if (shouldRegister) {
      stackPosition.stack.addModal(stackPosition.stackId, MODAL_Z_INDEX);
    } else {
      stackPosition.stack.removeModal(stackPosition.stackId);
    }
  });

  useEffect(() => {
    updateStackRegistration(isOpen);
    return () => updateStackRegistration(false);
  }, [isOpen, stackId]);

  return (
    <MantineModal.Root
      opened={isOpen}
      onClose={onRequestClose}
      centered
      closeOnClickOutside
      closeOnEscape={isTopOfStack}
      trapFocus={isTopOfStack}
      returnFocus
      zIndex={
        stackPosition === null
          ? MODAL_Z_INDEX
          : stackPosition.stack.getZIndex(stackPosition.stackId)
      }
      __handledEscapeEvents={stackPosition?.stack.handledEscapeEvents}
      transitionProps={{ transition: "fade", duration: 200 }}
      classNames={{
        inner: cx("positioner"),
        content: cx("content"),
      }}
    >
      <MantineModal.Overlay
        visible={stackPosition === null ? isOpen : isTopOfStack}
        // In a stack, the scrim moves from one modal to the next with no
        // fade, the same as in Mantine's full Modal.
        transitionProps={stackPosition === null ? undefined : { duration: 0 }}
      />
      <MantineModal.Content
        __hidden={stackPosition !== null && isOpen && !isTopOfStack}
        renderRoot={(contentProps: ComponentPropsWithRef<"section">) => (
          <section
            {...contentProps}
            role={role}
            aria-labelledby={
              aria?.labelledby ?? contentProps["aria-labelledby"]
            }
            aria-describedby={aria?.describedby}
            data-width={width}
          />
        )}
      >
        <RequestCloseContext value={onRequestClose}>
          {children}
        </RequestCloseContext>
      </MantineModal.Content>
    </MantineModal.Root>
  );
}

/** Title, optional description, and the close button (×). */
function Header({
  children,
  closeLabel,
}: {
  /** A `Modal.Title`, and an optional `Modal.Description`. */
  children: React.ReactNode;
  /** The accessible name of the close button, for example "Close". */
  closeLabel: string;
}) {
  const requestClose = use(RequestCloseContext);
  return (
    <div className={cx("header")}>
      <div className={cx("titleGroup")}>{children}</div>
      <CloseButton aria-label={closeLabel} onClick={requestClose} />
    </div>
  );
}

/** An `<h2>`. Mantine gives it an id and points `aria-labelledby` to it. */
function Title({ children }: { children: React.ReactNode }) {
  return (
    <MantineModal.Title className={cx("title")}>{children}</MantineModal.Title>
  );
}

function Description({
  children,
  id,
}: {
  children: React.ReactNode;
  /** Give an id when `aria.describedby` of the modal points here. */
  id?: string;
}) {
  return (
    <p className={cx("description")} id={id}>
      {children}
    </p>
  );
}

/** The free content area. It scrolls when the content is tall. */
function Inner({ children }: { children: React.ReactNode }) {
  return <div className={cx("inner")}>{children}</div>;
}

/** A row aligned to the end. Put raw `Button`s in it. */
function Footer({ children }: { children: React.ReactNode }) {
  return <div className={cx("footer")}>{children}</div>;
}

export const Modal = {
  Stack: MantineModal.Stack,
  Container,
  Header,
  Title,
  Description,
  Inner,
  Footer,
};
