import { Badge, Button, Group, Text } from "@mantine/core";

type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export function AdminBreadcrumbs({ items }: { items: AdminBreadcrumbItem[] }) {
  return (
    <Group component="nav" aria-label="Adminnavigering" gap={6} mb="xs">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1 || !item.href;

        return (
          <Group key={`${item.label}-${index}`} gap={6} wrap="nowrap">
            {index > 0 ? (
              <Text c="dimmed" size="xs" aria-hidden="true">
                /
              </Text>
            ) : null}
            {isCurrent ? (
              <Badge color="green" variant="filled" radius="xl" size="lg">
                {item.label}
              </Badge>
            ) : (
              <Button
                component="a"
                href={item.href}
                color="green"
                variant="light"
                radius="xl"
                size="xs"
              >
                {item.label}
              </Button>
            )}
          </Group>
        );
      })}
    </Group>
  );
}
