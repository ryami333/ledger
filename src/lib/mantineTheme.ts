import { Combobox, Menu, Popover, Tooltip, createTheme } from "@mantine/core";

/**
 * The value of `--z-index--popover` in src/styles/tokens/z-index.css. Mantine
 * takes the z-index of a popover as a number, not as a CSS variable.
 */
const POPOVER_Z_INDEX = 1700;

/**
 * The Mantine theme of ledger. The dropdowns, menus, and tooltips go above
 * the modals and the drawers. With the Mantine default (300), a Select in a
 * modal shows its options below the modal.
 */
export const mantineTheme = createTheme({
  components: {
    Popover: Popover.extend({ defaultProps: { zIndex: POPOVER_Z_INDEX } }),
    Combobox: Combobox.extend({ defaultProps: { zIndex: POPOVER_Z_INDEX } }),
    Menu: Menu.extend({ defaultProps: { zIndex: POPOVER_Z_INDEX } }),
    Tooltip: Tooltip.extend({ defaultProps: { zIndex: POPOVER_Z_INDEX } }),
  },
});
