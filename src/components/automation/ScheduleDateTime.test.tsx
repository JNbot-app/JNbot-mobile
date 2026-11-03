import React from "react";
import { Platform } from "react-native";
const { act, create } = require("jest-expo/node_modules/react-test-renderer");
jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: (props: object) =>
    require("react").createElement("MockNativeDate", props),
}));
jest.mock("../ui", () => ({
  Button: (props: object) =>
    require("react").createElement("MockButton", props),
}));
import ScheduleDateTime from "./ScheduleDateTime";

const timestamp = new Date(2026, 9, 12, 9, 30).getTime();
afterEach(() => jest.restoreAllMocks());

test("iOS uses the native combined date/time picker", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const onChange = jest.fn();
  let view: ReturnType<typeof create>;
  await act(async () => {
    view = create(<ScheduleDateTime value={timestamp} onChange={onChange} />);
  });
  const picker = view.root.findByType("MockNativeDate");
  expect(picker.props.mode).toBe("datetime");
  await act(async () =>
    picker.props.onChange({}, new Date(timestamp + 3600000)),
  );
  expect(onChange).toHaveBeenCalledWith(timestamp + 3600000);
  await act(async () => view.unmount());
});

test("Android date selection preserves the chosen time", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  const onChange = jest.fn();
  let view: ReturnType<typeof create>;
  await act(async () => {
    view = create(<ScheduleDateTime value={timestamp} onChange={onChange} />);
  });
  await act(async () =>
    view.root.findAllByType("MockButton")[0].props.onPress(),
  );
  const picker = view.root.findByType("MockNativeDate");
  expect(picker.props.mode).toBe("date");
  await act(async () => picker.props.onChange({}, new Date(2026, 9, 18, 0, 0)));
  expect(new Date(onChange.mock.calls[0][0]).getHours()).toBe(9);
  expect(new Date(onChange.mock.calls[0][0]).getMinutes()).toBe(30);
  expect(new Date(onChange.mock.calls[0][0]).getDate()).toBe(18);
  await act(async () => view.unmount());
});
