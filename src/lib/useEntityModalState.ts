import { useState } from "react";

/**
 * Keeps the open state of a modal, and the entity that the modal shows, for
 * example the row to delete.
 *
 * The entity stays set while `isOpen` is `false`. Thus the modal keeps its
 * text while it fades out. The entity is `null` until the first `open`, and
 * the next `open` replaces it.
 *
 *     const deleteModalState = useEntityModalState<Transaction>();
 *
 *     <ConfirmModal
 *       isOpen={deleteModalState.isOpen}
 *       onRequestClose={deleteModalState.close}
 *       title={deleteModalState.selectedEntity?.title ?? ""}
 *       …
 *     />
 *
 * A row opens the modal with `deleteModalState.open({ selectedEntity: row })`.
 *
 * Each `open` gives a new `key`. Give it to a form modal as its React `key`.
 * The form then starts again from its default values each time it opens:
 *
 *     <EditAliasModal key={editModalState.key} … />
 *
 * Modelled on `useEntityModalState` in Malteser Werke.
 */
export function useEntityModalState<Entity>() {
  const [state, setState] = useState<{
    isOpen: boolean;
    selectedEntity: Entity | null;
    key: number;
  }>({ isOpen: false, selectedEntity: null, key: 0 });

  return {
    ...state,
    open: ({ selectedEntity }: { selectedEntity: Entity }) =>
      setState((current) => ({
        isOpen: true,
        selectedEntity,
        key: current.key + 1,
      })),
    close: () => setState((current) => ({ ...current, isOpen: false })),
  };
}
