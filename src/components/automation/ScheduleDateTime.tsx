import React, { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "../ui";

export default function ScheduleDateTime({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [mode, setMode] = useState<"date" | "time">();
  if (Platform.OS === "ios")
    return (
      <DateTimePicker
        accessibilityLabel="Next run"
        value={new Date(value)}
        mode="datetime"
        display="compact"
        onChange={(_event, date) => {
          if (date) onChange(date.getTime());
        }}
      />
    );
  return (
    <View style={{ gap: 8 }}>
      <Button
        title={new Date(value).toLocaleDateString()}
        variant="secondary"
        onPress={() => setMode("date")}
      />
      <Button
        title={new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        variant="secondary"
        onPress={() => setMode("time")}
      />
      {mode && (
        <DateTimePicker
          value={new Date(value)}
          mode={mode}
          onChange={(_event, date) => {
            setMode(undefined);
            if (!date) return;
            const next = new Date(value);
            if (mode === "date")
              next.setFullYear(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
              );
            else next.setHours(date.getHours(), date.getMinutes(), 0, 0);
            onChange(next.getTime());
          }}
        />
      )}
    </View>
  );
}
