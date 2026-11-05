import { formatRate } from "../../../core/currencies/formatRate.ts";
import { parseRate } from "../../../core/currencies/parseRate.ts";
import { splidImportFormSchema } from "../../../core/forms/splidImportFormSchema.ts";
import { guessMemberIds } from "../../../core/imports/guessMemberIds.ts";
import {
  type SplidExport,
  parseSplidExport,
} from "../../../core/imports/parseSplidExport.ts";
import { importSplidExportServerFn } from "../../../serverFunctions/importSplidExportServerFn.ts";
import { SettingsSection } from "./SettingsSection.tsx";
import type { SettingsMember } from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Anchor,
  Button,
  FileInput,
  Group,
  List,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { type z } from "zod";

type ImportFormInput = z.input<typeof splidImportFormSchema>;
type ImportFormOutput = z.output<typeof splidImportFormSchema>;

type ImportSummary = Awaited<ReturnType<typeof importSplidExportServerFn>>;

/** The number of problems that the summary shows. */
const VISIBLE_PROBLEM_COUNT = 20;

/**
 * The CSV import of a Splid export. The user selects the file, then the
 * member of each name in the file. "Check the Import" shows what the import
 * does, with no write. Then "Import" adds the transactions, and the new
 * currencies with a rate from the export. Each transaction keeps the rate of
 * its own row (PLAN.md, D5).
 */
export function ImportSection({
  spaceId,
  locale,
  defaultCurrency,
  members,
}: {
  spaceId: string;
  locale: string;
  defaultCurrency: string;
  members: SettingsMember[];
}) {
  const router = useRouter();
  const activeMembers = members.filter((member) => !member.isArchived);
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<{
    csvText: string;
    splidExport: SplidExport;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // The summary of the last check, with the member IDs that it used. A
  // change of a member makes the summary old.
  const [checked, setChecked] = useState<{
    memberIds: string[];
    summary: ImportSummary;
  } | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const form = useForm<ImportFormInput, unknown, ImportFormOutput>({
    resolver: zodResolver(splidImportFormSchema),
    defaultValues: { memberIds: [] },
  });
  const { errors, isSubmitting } = form.formState;
  const memberIds = useWatch({ control: form.control, name: "memberIds" });
  const summary =
    checked !== null && checked.memberIds.join() === memberIds.join()
      ? checked.summary
      : null;

  const selectFile = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setUpload(null);
    setFileError(null);
    setChecked(null);
    setImportedCount(null);
    form.clearErrors();
    if (selectedFile === null) return;
    const csvText = await selectedFile.text();
    const result = parseSplidExport(csvText);
    if ("error" in result) {
      setFileError(result.error);
      return;
    }
    setUpload({ csvText, splidExport: result.splidExport });
    form.reset({
      memberIds: guessMemberIds({
        names: result.splidExport.memberNames,
        members: activeMembers,
        locale,
      }),
    });
  };

  const runImport = async ({
    values,
    isDryRun,
  }: {
    values: ImportFormOutput;
    isDryRun: boolean;
  }): Promise<void> => {
    if (upload === null) return;
    try {
      const result = await importSplidExportServerFn({
        data: {
          spaceId,
          csvText: upload.csvText,
          memberIds: values.memberIds,
          isDryRun,
        },
      });
      if (isDryRun) {
        setChecked({ memberIds: values.memberIds, summary: result });
        return;
      }
      setImportedCount(result.importedCount);
      setFile(null);
      setUpload(null);
      setChecked(null);
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "The transactions cannot be imported.",
      });
    }
  };

  const formatCount = (count: number) =>
    new Intl.NumberFormat(locale).format(count);
  const memberOptions = activeMembers.map((member) => ({
    value: member.id,
    label: member.name,
  }));
  const listError =
    errors.memberIds?.message ?? errors.memberIds?.root?.message;

  return (
    <SettingsSection
      title="Import"
      description={`Import the transactions of a Splid export ("Summary" as CSV). The member amounts in the file must be in ${defaultCurrency}, the default currency of the space.`}
    >
      <Stack gap="sm">
        {importedCount !== null && (
          <Alert
            color="green"
            withCloseButton
            onClose={() => setImportedCount(null)}
          >
            {formatCount(importedCount)} transactions are imported.{" "}
            <Anchor
              renderRoot={(props) => (
                <Link {...props} to="/spaces/$spaceId" params={{ spaceId }} />
              )}
            >
              Show the Transactions
            </Anchor>
          </Alert>
        )}
        <FileInput
          label="Splid export"
          placeholder="Select a CSV file"
          accept=".csv,text/csv"
          clearable
          value={file}
          onChange={(selectedFile) => void selectFile(selectedFile)}
          error={fileError}
        />
        {upload && (
          <form
            onSubmit={form.handleSubmit((values) =>
              runImport({ values, isDryRun: true }),
            )}
            noValidate
          >
            <Stack gap="sm">
              <Text size="sm">
                {upload.splidExport.groupName
                  ? `${upload.splidExport.groupName}: `
                  : ""}
                {formatCount(upload.splidExport.rows.length)} rows. Select the
                member for each name in the file.
              </Text>
              {errors.root?.message && (
                <Alert color="red">{errors.root.message}</Alert>
              )}
              {listError && <Alert color="red">{listError}</Alert>}
              <Group grow align="flex-start">
                {upload.splidExport.memberNames.map((name, nameIndex) => (
                  <Controller
                    key={`${nameIndex}-${name}`}
                    control={form.control}
                    name={`memberIds.${nameIndex}`}
                    render={({ field }) => (
                      <Select
                        label={`"${name}" in the file`}
                        placeholder="Select a member"
                        required
                        allowDeselect={false}
                        data={memberOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(value ?? "")}
                        onBlur={field.onBlur}
                        error={errors.memberIds?.[nameIndex]?.message}
                      />
                    )}
                  />
                ))}
              </Group>
              {summary === null ? (
                <Group>
                  <Button
                    type="submit"
                    variant="default"
                    loading={isSubmitting}
                  >
                    Check the Import
                  </Button>
                </Group>
              ) : (
                <ImportSummaryPanel
                  summary={summary}
                  formatCount={formatCount}
                  isSubmitting={isSubmitting}
                  onRequestImport={form.handleSubmit((values) =>
                    runImport({ values, isDryRun: false }),
                  )}
                />
              )}
            </Stack>
          </form>
        )}
      </Stack>
    </SettingsSection>
  );
}

/** The result of "Check the Import", and the button that imports. */
function ImportSummaryPanel({
  summary,
  formatCount,
  isSubmitting,
  onRequestImport,
}: {
  summary: ImportSummary;
  formatCount: (count: number) => string;
  isSubmitting: boolean;
  onRequestImport: () => void;
}) {
  const hiddenProblemCount = summary.problems.length - VISIBLE_PROBLEM_COUNT;
  return (
    <Stack gap="sm" aria-live="polite">
      <List size="sm" spacing={4}>
        <List.Item>
          {formatCount(summary.transactionCount)} transactions to import.
        </List.Item>
        {summary.duplicateCount > 0 && (
          <List.Item>
            {formatCount(summary.duplicateCount)} rows are already in the space
            (same date, title, amount, and currency). The import skips them.
          </List.Item>
        )}
        {summary.newCurrencies.map((newCurrency) => {
          const scaledRate = parseRate(newCurrency.rate);
          return (
            <List.Item key={newCurrency.currency}>
              New currency: 1 {newCurrency.currency} ={" "}
              {scaledRate === null ? newCurrency.rate : formatRate(scaledRate)}{" "}
              {summary.defaultCurrency}, from the amounts in the file. New
              transactions get this rate. You can change it after the import.
            </List.Item>
          );
        })}
      </List>
      {summary.problems.length > 0 && (
        <Alert color="yellow" title="Rows that the import skips">
          <List size="sm" spacing={2}>
            {summary.problems.slice(0, VISIBLE_PROBLEM_COUNT).map((problem) => (
              <List.Item key={problem.lineNumber}>
                Line {problem.lineNumber}, {problem.title || "no title"}:{" "}
                {problem.message}
              </List.Item>
            ))}
            {hiddenProblemCount > 0 && (
              <List.Item>And {formatCount(hiddenProblemCount)} more.</List.Item>
            )}
          </List>
        </Alert>
      )}
      <Group>
        <Button
          onClick={onRequestImport}
          loading={isSubmitting}
          disabled={summary.transactionCount === 0}
        >
          Import {formatCount(summary.transactionCount)} Transactions
        </Button>
      </Group>
    </Stack>
  );
}
