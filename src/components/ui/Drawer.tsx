import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  type ComponentPropsWithRef,
} from "react";
import {
  CloseButton,
  Drawer as MantineDrawer,
  ModalStackContext,
} from "@mantine/core";
import classNames from "classnames/bind";
import styles from "./Drawer.module.css";

const cx = classNames.bind(styles);

/**
 * The value of `--z-index--drawer` in src/styles/tokens/z-index.css. Mantine's
 * Modal.Stack increases its base z-index only from a number, not from a CSS
 * variable. Thus this value is a number here too.
 */
const DRAWER_Z_INDEX = 1500;

/** Gives the close button of `Drawer.Header` the close callback of its drawer. */
const RequestCloseContext = createContext<() => void>(() => {});

/**
 * The drawer. It has the same parts and the same behaviour as `Modal`, but the
 * frame is a full-height panel at the inline end of the viewport (the right in
 * a left-to-right layout). It slides in from that edge.
 *
 * It gives only the parts that all drawers share: the scrim, the frame, the
 * focus trap and the return of the focus, close on Escape and on a scrim
 * click, the slide transition, and stacking.
 *
 * A drawer is never a confirmation. To confirm an action from a drawer, open
 * a `ConfirmModal` on top of it.
 *
 * Mantine's full `Drawer` points `aria-describedby` at the whole body. Thus
 * this component builds the drawer from the compound parts of Mantine.
 *
 * A drawer joins a `Modal.Stack`, not a `Drawer.Stack` of Mantine. The modals
 * that a drawer opens can then be in the same stack as the drawer. In a stack,
 * only the top layer closes on Escape and traps the focus. Without a common
 * stack, one Escape closes the modal and the drawer, and the two focus traps
 * compete.
 */
function Container({
  isOpen,
  onRequestClose,
  children,
  aria,
  stackId,
  width = "default",
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  aria?: {
    /** Only for a drawer with no `Drawer.Title`. `Drawer.Title` sets the label. */
    labelledby?: string;
    describedby?: string;
  };
  /**
   * A fixed, readable id, prefixed with the feature, for example
   * `"transaction-details"`. Give it to each drawer in a `Modal.Stack`.
   */
  stackId?: string;
  /**
   * - `"default"`: 480px, for a short form or a list of details.
   * - `"wide"`: 720px, for a drawer with much content.
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
      stackPosition.stack.addModal(stackPosition.stackId, DRAWER_Z_INDEX);
    } else {
      stackPosition.stack.removeModal(stackPosition.stackId);
    }
  });

  useEffect(() => {
    updateStackRegistration(isOpen);
    return () => updateStackRegistration(false);
  }, [isOpen, stackId]);

  return (
    <MantineDrawer.Root
      opened={isOpen}
      onClose={onRequestClose}
      // Mantine puts a "right" drawer at the inline end, and mirrors the
      // position and the slide transition in a right-to-left layout.
      position="right"
      closeOnClickOutside
      closeOnEscape={isTopOfStack}
      trapFocus={isTopOfStack}
      returnFocus
      zIndex={
        stackPosition === null
          ? DRAWER_Z_INDEX
          : stackPosition.stack.getZIndex(stackPosition.stackId)
      }
      __handledEscapeEvents={stackPosition?.stack.handledEscapeEvents}
      transitionProps={{ duration: 200 }}
      classNames={{
        content: cx("content"),
      }}
    >
      <MantineDrawer.Overlay
        visible={stackPosition === null ? isOpen : isTopOfStack}
        // In a stack, the scrim moves from one layer to the next with no
        // fade, the same as in Mantine's full Drawer.
        transitionProps={stackPosition === null ? undefined : { duration: 0 }}
      />
      {/* Mantine hides each lower modal of a stack. A drawer stays visible
          below the scrim of the layer on top, so that the user sees what a
          modal on top of the drawer is about. */}
      <MantineDrawer.Content
        renderRoot={(contentProps: ComponentPropsWithRef<"section">) => (
          <section
            {...contentProps}
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
      </MantineDrawer.Content>
    </MantineDrawer.Root>
  );
}

/** Title, optional description, and the close button (×). */
function Header({
  children,
  closeLabel,
}: {
  /** A `Drawer.Title`, and an optional `Drawer.Description`. */
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
    <MantineDrawer.Title className={cx("title")}>
      {children}
    </MantineDrawer.Title>
  );
}

function Description({
  children,
  id,
}: {
  children: React.ReactNode;
  /** Give an id when `aria.describedby` of the drawer points here. */
  id?: string;
}) {
  return (
    <p className={cx("description")} id={id}>
      {children}
    </p>
  );
}

/** The free content area. It fills the height and scrolls when the content is tall. */
function Inner({ children }: { children: React.ReactNode }) {
  return <div className={cx("inner")}>{children}</div>;
}

/** A row aligned to the end, at the bottom of the drawer. Put raw `Button`s in it. */
function Footer({ children }: { children: React.ReactNode }) {
  return <div className={cx("footer")}>{children}</div>;
}

export const Drawer = {
  Container,
  Header,
  Title,
  Description,
  Inner,
  Footer,
};
