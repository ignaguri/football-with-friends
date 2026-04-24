import { Fragment, type ReactElement } from "react";
import { RosterSeparator } from "./RosterSeparator";

export function renderWithSeparators<T extends { id: string }>(
  items: T[],
  renderItem: (item: T) => ReactElement,
): ReactElement[] {
  return items.map((item, i) => (
    <Fragment key={item.id}>
      {i > 0 && <RosterSeparator />}
      {renderItem(item)}
    </Fragment>
  ));
}
