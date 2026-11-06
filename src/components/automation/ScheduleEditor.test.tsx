import React from "react";
import type { ScriptSchedule } from "../../generated/client-contract/cooldowns";
const { act, create } = require("jest-expo/node_modules/react-test-renderer");
const mockUpdate = jest.fn(async () => {});
const mockClient = { updateSettings: mockUpdate };
const mockClose = jest.fn();
const mockDelete = jest.fn();
const mockScripts = [
  { info: { pluginId: "miner", name: "Mining", scriptType: "script" } },
];
const mockSchedule: ScriptSchedule = {
  kind: "schedule",
  id: "s",
  name: "Mining",
  pluginId: "miner",
  nextRunAt: Date.now() + 86_400_000,
  autoStart: true,
};
const mockState = { settings: { reminders: [mockSchedule] } };
jest.mock("../../store/store", () => ({
  useStore: Object.assign(
    (selector: (state: typeof mockState) => unknown) => selector(mockState),
    { getState: () => mockState },
  ),
  selectProfileReady: () => true,
  selectCanUseAccounts: () => true,
}));
jest.mock("../../net/ConnectionProvider", () => ({
  useClient: () => mockClient,
}));
jest.mock("../../hooks/useAsyncAction", () => ({
  useAsyncAction: () => ({
    busy: false,
    run: (action: () => Promise<void>) => action(),
  }),
}));
jest.mock("../../hooks/useRunnableScripts", () => ({
  useRunnableScripts: () => ({ scripts: mockScripts, loading: false }),
}));
jest.mock("../BottomSheet", () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("../ui", () => ({
  Txt: ({ children }: { children: React.ReactNode }) =>
    require("react").createElement("MockText", {}, children),
  Button: (props: object) =>
    require("react").createElement("MockButton", props),
}));
jest.mock("../PickerField", () => ({
  PickerField: (props: object) =>
    require("react").createElement("MockPicker", props),
}));
jest.mock("./ScheduleDateTime", () => ({
  __esModule: true,
  default: (props: object) => require("react").createElement("MockDate", props),
}));
jest.mock("./ScheduleOverrides", () => ({
  __esModule: true,
  default: (props: object) =>
    require("react").createElement("MockOverrides", props),
}));
import ScheduleEditor from "./ScheduleEditor";

beforeEach(() => {
  jest.clearAllMocks();
  mockState.settings.reminders = [mockSchedule];
});

test("saves a custom repeat and partial overrides without changing script settings", async () => {
  let view: ReturnType<typeof create>;
  await act(async () => {
    view = create(
      <ScheduleEditor
        schedule={mockSchedule}
        onClose={mockClose}
        onDelete={mockDelete}
      />,
    );
  });
  await act(async () => {
    view.root.findByProps({ title: "Repeat" }).props.onChange("custom");
  });
  await act(async () => {
    view.root
      .findByProps({ accessibilityLabel: "Repeat interval" })
      .props.onChangeText("3");
    view.root.findByProps({ title: "Repeat unit" }).props.onChange("week");
    view.root
      .findByType("MockOverrides")
      .props.onChange({ gamemode: "skyblock" });
  });
  await act(async () => {
    view.root.findByProps({ title: "Save schedule" }).props.onPress();
  });
  expect(mockUpdate).toHaveBeenCalledWith({
    path: ["reminders"],
    value: [
      expect.objectContaining({
        kind: "schedule",
        repeat: { every: 3, unit: "week" },
        options: { gamemode: "skyblock" },
      }),
    ],
  });
  expect(mockClose).toHaveBeenCalled();
  await act(async () => view.unmount());
});

test("rejects past dates without sending an update and supports delete", async () => {
  let view: ReturnType<typeof create>;
  await act(async () => {
    view = create(
      <ScheduleEditor
        schedule={{ ...mockSchedule, nextRunAt: 1 }}
        onClose={mockClose}
        onDelete={mockDelete}
      />,
    );
  });
  await act(async () => {
    view.root.findByProps({ title: "Save schedule" }).props.onPress();
  });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(JSON.stringify(view.toJSON())).toContain(
    "Choose a future date and time.",
  );
  await act(async () => {
    view.root.findByProps({ title: "Delete schedule" }).props.onPress();
  });
  expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "s" }));
  await act(async () => view.unmount());
});
