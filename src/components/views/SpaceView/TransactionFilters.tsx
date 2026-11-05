import type { TransactionFilterValues } from "./SpaceView.types.ts";
import { CloseButton, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDebouncedCallback } from "@mantine/hooks";
import { useState } from "react";
import classNames from "classnames/bind";
import styles from "./TransactionFilters.module.css";

const cx = classNames.bind(styles);

/** The time after the last key press, before the search changes the URL. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The search input and the date range of the transaction list. The search
 * finds a text in the title or the description, or an amount, for example
 * "44,76" or "44.76".
 *
 * The input keeps its own text and gives it to `onChange` after a short
 * pause. Thus each key press does not change the URL.
 */
export function TransactionFilters({
  filters,
  onChange,
}: {
  filters: TransactionFilterValues;
  onChange: (change: Partial<Omit<TransactionFilterValues, "page">>) => void;
}) {
  const [inputText, setInputText] = useState(filters.searchText);
  // The last search text that the input and the URL agree on. A different
  // text in the URL, for example after the back button, replaces the input.
  const [syncedText, setSyncedText] = useState(filters.searchText);
  if (filters.searchText !== syncedText) {
    setSyncedText(filters.searchText);
    setInputText(filters.searchText);
  }

  const commitSearchText = (searchText: string) => {
    setSyncedText(searchText);
    onChange({ searchText });
  };
  const notifySearchText = useDebouncedCallback(
    commitSearchText,
    SEARCH_DEBOUNCE_MS,
  );

  const clearSearch = () => {
    notifySearchText.cancel();
    setInputText("");
    commitSearchText("");
  };

  return (
    <div className={cx("root")} role="search">
      <TextInput
        className={cx("search")}
        type="search"
        aria-label="Search transactions"
        placeholder="Search title, notes, or amount"
        value={inputText}
        onChange={(event) => {
          setInputText(event.currentTarget.value);
          notifySearchText(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && inputText !== "") {
            event.preventDefault();
            clearSearch();
          }
        }}
        rightSection={
          inputText === "" ? null : (
            <CloseButton
              aria-label="Clear search"
              size="sm"
              onClick={clearSearch}
            />
          )
        }
      />
      <DatePickerInput
        className={cx("dates")}
        type="range"
        aria-label="Date range"
        placeholder="Any date"
        valueFormat="D MMM YYYY"
        clearable
        allowSingleDateInRange
        value={[filters.fromDate, filters.toDate]}
        onChange={([fromDate, toDate]) =>
          onChange({ fromDate: fromDate ?? null, toDate: toDate ?? null })
        }
      />
    </div>
  );
}
