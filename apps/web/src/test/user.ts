import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Keep complete asynchronous interactions inside React's act boundary.
export function setupUser() {
  const user = userEvent.setup();
  return {
    click: (element: Element) =>
      act(async () => {
        await user.click(element);
      }),
    dblClick: (element: Element) =>
      act(async () => {
        await user.dblClick(element);
      }),
    type: (element: Element, text: string) =>
      act(async () => {
        await user.type(element, text);
      }),
    selectOptions: (element: Element, values: HTMLElement | HTMLElement[] | string[] | string) =>
      act(async () => {
        await user.selectOptions(element, values);
      }),
    clear: (element: Element) =>
      act(async () => {
        await user.clear(element);
      }),
    tab: () =>
      act(async () => {
        await user.tab();
      }),
    keyboard: (text: string) =>
      act(async () => {
        await user.keyboard(text);
      }),
  };
}
