import React, { useCallback } from "react";
import { Checkbox, DatePicker, Slider } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import minMax from "dayjs/plugin/minMax";
import {
  CalendarOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useDatesContext } from "./DatesProvider.tsx";
import throttle from "../lib/throttle.ts";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(minMax);

const { RangePicker } = DatePicker;

const disabledDateTime = (current: Dayjs) => {
  const range = (start: number, end: number) => {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  };

  const now = dayjs();
  const currentHour = now.hour();

  const baseDisabled = {
    disabledMinutes: () => range(1, 60),
    disabledSeconds: () => range(1, 60),
  };

  if (!current.isSame(now, "day")) {
    return baseDisabled;
  }

  return {
    ...baseDisabled,
    disabledHours: () => range(currentHour + 1, 24),
  };
};

const disabledRangeDate = (
  current: Dayjs,
  info: { type: string; from?: Dayjs },
) => {
  if (current.isAfter(dayjs(), "day")) {
    return true;
  }

  if (info.type === "end" && info.from) {
    return current.isSameOrBefore(info.from, "day");
  }

  return false;
};

const Timeline: React.FC = () => {
  const {
    dateRange,
    visualisationTimeRange,
    totalMinutes,
    currentSliderMinute,
    isNightOnly,
    isPlaying,
    setSliderMinute,
    handleDateRangeChange,
    setIsNightOnly,
    togglePlay,
  } = useDatesContext();
  const throttleMs = 100;

  const handleSliderChange = useCallback(
    throttle((value: number) => {
      setSliderMinute(value);
    }, throttleMs),
    [setSliderMinute, throttleMs],
  );

  const handleStepChange = useCallback(
    (direction: -1 | 1) => {
      setSliderMinute(currentSliderMinute + direction);
    },
    [setSliderMinute, currentSliderMinute],
  );

  return (
    <div className="bg-black border-t border-t-white text-white p-4">
      <div className="my-2 flex">
        <div className="mr-auto">
          <button
            type="button"
            className="p-2 py-1 border border-white mr-10"
            onClick={() => {
              togglePlay();
            }}
          >
            {!isPlaying ? "Play" : "Stop"}
          </button>
          <button
            type="button"
            className="p-2 py-1 border border-white mr-6"
            disabled={currentSliderMinute === 1}
            onClick={() => {
              handleStepChange(-1);
            }}
          >
            <CaretLeftOutlined className="text-white" />
          </button>
          <button
            type="button"
            disabled={currentSliderMinute === totalMinutes}
            className="p-2 py-1 border border-white"
            onClick={() => {
              handleStepChange(1);
            }}
          >
            <CaretRightOutlined className="text-white" />
          </button>
        </div>
        <RangePicker
          showTime
          format="DD.MM.YYYY HH:mm"
          placement="topLeft"
          separator={<RightOutlined />}
          className="[&.ant-picker-separator]:[--ant-color-text-quaternary:#fff]"
          placeholder={["Von", "Bis"]}
          defaultValue={[dayjs(dateRange.from), dayjs(dateRange.to)]}
          suffixIcon={false}
          maxLength={31}
          maxDate={dayjs().startOf("hour")}
          disabledTime={disabledDateTime}
          disabledDate={disabledRangeDate}
          hideDisabledOptions
          prefix={<CalendarOutlined />}
          allowClear={false}
          onChange={(dates) => {
            if (dates?.[0] && dates[1]) {
              handleDateRangeChange({
                from: dates[0].startOf("minute"),
                to: dates[1].startOf("minute"),
              });
            }
          }}
          popupStyle={{ position: "fixed" }}
          classNames={{
            root: "border-0 border-b rounded-none border-white bg-black text-white w-auto cursor-pointer p-0 pb-1",
            input: "text-white placeholder:text-white w-[13.95ch]",
            prefix: "text-white",
            suffix: "hidden",
            popup: "text-black",
          }}
        />
        <div className="ml-auto">
          <Checkbox
            className="text-white"
            checked={isNightOnly}
            onChange={(e) => {
              setIsNightOnly(e.target.checked);
            }}
          >
            Nur Nächte zeigen
          </Checkbox>
        </div>
      </div>

      <div className="flex items-center">
        <Slider
          min={1}
          max={totalMinutes}
          value={currentSliderMinute}
          onChange={handleSliderChange}
          className="mt-4 grow mr-4"
          classNames={{
            track: "bg-primary",
            rail: "bg-gray-400",
            handle: "[&:after]:bg-primary [&:after]:shadow-none",
          }}
          tooltip={{
            formatter: () => visualisationTimeRange.from.format("HH:mm"),
          }}
        />
        <p className="whitespace-nowrap min-w-fit">
          {visualisationTimeRange.from.format("DD.MM.YYYY HH:mm")} -{" "}
          {visualisationTimeRange.to.format("HH:mm")}
        </p>
      </div>
    </div>
  );
};

export default Timeline;
