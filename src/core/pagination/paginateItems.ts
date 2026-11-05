/**
 * Gives one page of a list. `page` starts at 1. A page after the last page
 * gives the last page, and a page before the first page gives the first
 * page. An empty list has one empty page.
 */
export const paginateItems = <Item>({
  items,
  page,
  pageSize,
}: {
  items: readonly Item[];
  page: number;
  pageSize: number;
}): { pageItems: Item[]; page: number; pageCount: number } => {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.trunc(page)), pageCount);
  const start = (clampedPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: clampedPage,
    pageCount,
  };
};
