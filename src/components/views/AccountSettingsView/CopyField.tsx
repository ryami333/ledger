import { Button, CopyButton, Group, TextInput } from "@mantine/core";

/** A read-only text with a copy button, for a URL or a command. */
export function CopyField({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  /** The action label of the button, for example "Copy URL". */
  copyLabel: string;
}) {
  return (
    <Group gap="xs" align="end" wrap="nowrap">
      <TextInput
        label={label}
        value={value}
        readOnly
        flex={1}
        styles={{
          input: { fontFamily: "var(--mantine-font-family-monospace)" },
        }}
        onFocus={(event) => event.currentTarget.select()}
      />
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            variant={copied ? "light" : "filled"}
            color={copied ? "teal" : undefined}
            onClick={copy}
            miw={110}
          >
            {copied ? "Copied" : copyLabel}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
}
