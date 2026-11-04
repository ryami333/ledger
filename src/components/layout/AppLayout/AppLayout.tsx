import { signOutServerFn } from "../../../serverFunctions/signOutServerFn.ts";
import classNames from "classnames/bind";
import { AppShell, Button, Group, Menu, Text } from "@mantine/core";
import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./AppLayout.module.css";

const cx = classNames.bind(styles);

/**
 * The shell of each signed-in page: a header with the product name and a
 * menu with the name of the user and "Sign out".
 */
export function AppLayout({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutServerFn();
    await router.navigate({ to: "/login" });
  };

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group className={cx("header")} justify="space-between" wrap="nowrap">
          <Link to="/" className={cx("brand")}>
            ledger
          </Link>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button variant="subtle" color="gray" size="compact-sm">
                {userName}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text size="xs" truncate>
                  {userEmail}
                </Text>
              </Menu.Label>
              <Menu.Item onClick={handleSignOut}>Sign out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <div className={cx("content")}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
