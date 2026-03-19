import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DetectionItemFragment } from "../gql/graphql.ts";
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
import { useMapContext } from "./MapProvider.tsx";
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

interface TimelineProps {
  showAllDetections: boolean;
  onToggleAllDetections: (value: boolean) => void;
  allDetections: DetectionItemFragment[];
  speciesColors: Record<string, string>;
  speciesLabels: Record<string, string>;
}

const Timeline: React.FC<TimelineProps> = ({
  showAllDetections,
  onToggleAllDetections,
  allDetections,
  speciesColors,
  speciesLabels,
}) => {
  const {
    dateRange,
    visualisationTimeRange,
    timeSegments,
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

  // --- Histogram ---

  const { map } = useMapContext();

  // Track current map viewport so the histogram matches what the map shows.
  const [mapBounds, setMapBounds] = useState<{
    swLat: number; swLon: number; neLat: number; neLon: number;
  } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      setMapBounds({
        swLat: b.getSouthWest().lat,
        swLon: b.getSouthWest().lng,
        neLat: b.getNorthEast().lat,
        neLon: b.getNorthEast().lng,
      });
    };
    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map]);

  const histogramRef = useRef<HTMLCanvasElement>(null);

  // Bin detections into N buckets mapped to virtual-minute positions.
  const histogramBins = useMemo(() => {
    if (totalMinutes === 0 || allDetections.length === 0) return null;

    // Keep only detections within the current map viewport.
    const visibleDetections = mapBounds
      ? allDetections.filter(
          (d) =>
            d.coords.lat >= mapBounds.swLat &&
            d.coords.lat <= mapBounds.neLat &&
            d.coords.lon >= mapBounds.swLon &&
            d.coords.lon <= mapBounds.neLon,
        )
      : allDetections;

    if (visibleDetections.length === 0) return null;

    const numBins = Math.min(totalMinutes, 300);
    const minutesPerBin = totalMinutes / numBins;

    // bins[i] = Map<speciesId, count>
    const bins: Map<string, number>[] = Array.from(
      { length: numBins },
      () => new Map(),
    );

    for (const detection of visibleDetections) {
      const t = dayjs(detection.timestamp).valueOf();

      // Map timestamp → virtual minute (inverse of setSliderMinute)
      let virtualMinute: number | null = null;
      for (const seg of timeSegments) {
        if (t >= seg.start.valueOf() && t < seg.end.valueOf()) {
          virtualMinute =
            seg.accumulatedStart +
            Math.floor((t - seg.start.valueOf()) / 60_000);
          break;
        }
      }
      if (virtualMinute === null) continue;

      const binIndex = Math.min(
        Math.floor(virtualMinute / minutesPerBin),
        numBins - 1,
      );
      const species = detection.species.id;
      bins[binIndex].set(species, (bins[binIndex].get(species) ?? 0) + 1);
    }

    // Build a name lookup for the tooltip
    const speciesNames = new Map<string, string>();
    for (const d of visibleDetections) {
      if (!speciesNames.has(d.species.id)) {
        speciesNames.set(d.species.id, d.species.scientificName ?? d.species.id);
      }
    }

    return { bins, numBins, speciesNames };
  }, [allDetections, timeSegments, totalMinutes, mapBounds]);

  // Draw the histogram onto the canvas whenever bins or colors change.
  // A ResizeObserver handles the initial paint and any container width changes.
  useEffect(() => {
    const canvas = histogramRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width === 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      if (!histogramBins) return;

      const { bins, numBins } = histogramBins;
      const barWidth = width / numBins;

      // Normalise against the tallest bin
      let maxCount = 1;
      for (const bin of bins) {
        let total = 0;
        bin.forEach((c) => { total += c; });
        if (total > maxCount) maxCount = total;
      }

      for (let i = 0; i < numBins; i++) {
        const bin = bins[i];
        if (bin.size === 0) continue;

        let currentBottom = height;

        bin.forEach((count, species) => {
          const segHeight = (count / maxCount) * height;
          const hex = speciesColors[species] ?? "#ffffff";
          ctx.fillStyle = hex + "B3"; // ~70 % opacity
          ctx.fillRect(
            i * barWidth,
            currentBottom - segHeight,
            Math.max(barWidth - 0.5, 0.5),
            segHeight,
          );
          currentBottom -= segHeight;
        });
      }
    };

    // Explicit call covers data changes; ResizeObserver covers container resizes.
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => { observer.disconnect(); };
  }, [histogramBins, speciesColors]);

  // --- Histogram interaction ---

  const [hoveredBin, setHoveredBin] = useState<{
    binIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // Convert a virtual-minute slider position back to a real timestamp.
  const virtualMinuteToTime = useCallback(
    (virtualMinute: number): dayjs.Dayjs | null => {
      for (const seg of timeSegments) {
        if (
          virtualMinute >= seg.accumulatedStart &&
          virtualMinute < seg.accumulatedStart + seg.durationMinutes
        ) {
          return seg.start.add(virtualMinute - seg.accumulatedStart, "minute");
        }
      }
      return null;
    },
    [timeSegments],
  );

  const getBinIndexFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): number | null => {
      if (!histogramBins) return null;
      const { numBins } = histogramBins;
      return Math.min(
        Math.floor((e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * numBins),
        numBins - 1,
      );
    },
    [histogramBins],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const binIndex = getBinIndexFromEvent(e);
      if (binIndex === null) return;
      setHoveredBin({ binIndex, x: e.clientX, y: e.clientY });
    },
    [getBinIndexFromEvent],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredBin(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const binIndex = getBinIndexFromEvent(e);
      if (binIndex === null || !histogramBins) return;
      const minutesPerBin = totalMinutes / histogramBins.numBins;
      setSliderMinute(Math.max(1, Math.round(binIndex * minutesPerBin)));
    },
    [getBinIndexFromEvent, histogramBins, totalMinutes, setSliderMinute],
  );

  // Data to render inside the tooltip for the hovered bin.
  const tooltipData = useMemo(() => {
    if (!hoveredBin || !histogramBins) return null;
    const { bins, numBins, speciesNames } = histogramBins;
    const bin = bins[hoveredBin.binIndex];
    let total = 0;
    bin.forEach((c) => { total += c; });
    if (total === 0) return null;

    const minutesPerBin = totalMinutes / numBins;
    const startMinute = Math.floor(hoveredBin.binIndex * minutesPerBin);
    const startTime = virtualMinuteToTime(startMinute);

    return { bin, total, startTime, speciesNames };
  }, [hoveredBin, histogramBins, totalMinutes, virtualMinuteToTime]);

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
        <div className="ml-auto flex gap-4 items-center">
          <Checkbox
            className="text-white"
            checked={showAllDetections}
            onChange={(e) => {
              onToggleAllDetections(e.target.checked);
            }}
          >
            Alle Detektionen
          </Checkbox>
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

      <div className="flex items-center mt-2">
        <div className="grow mr-4 flex flex-col">
          <canvas
            ref={histogramRef}
            className="w-full cursor-pointer"
            style={{ height: 40 }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onClick={handleCanvasClick}
          />
          <Slider
            min={1}
            max={totalMinutes}
            value={currentSliderMinute}
            onChange={handleSliderChange}
            className="mt-1"
            classNames={{
              track: "bg-primary",
              rail: "bg-gray-400",
              handle: "[&:after]:bg-primary [&:after]:shadow-none",
            }}
            tooltip={{
              formatter: () => visualisationTimeRange.from.format("HH:mm"),
            }}
          />
        </div>
        <p className="whitespace-nowrap min-w-fit">
          {visualisationTimeRange.from.format("DD.MM.YYYY HH:mm")} -{" "}
          {visualisationTimeRange.to.format("HH:mm")}
        </p>
      </div>

      {tooltipData && hoveredBin && (
        <div
          className="fixed z-50 pointer-events-none bg-black border border-white/30 text-white text-xs rounded px-2 py-1.5 flex flex-col gap-0.5"
          style={{
            left: Math.min(hoveredBin.x + 14, window.innerWidth - 180),
            top: hoveredBin.y - 72,
          }}
        >
          {tooltipData.startTime && (
            <span className="font-medium mb-0.5">
              {tooltipData.startTime.format("DD.MM. HH:mm")}
            </span>
          )}
          {[...tooltipData.bin.entries()].map(([speciesId, count]) => (
            <span key={speciesId} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-sm shrink-0"
                style={{ background: speciesColors[speciesId] ?? "#fff" }}
              />
              <span className="truncate max-w-[140px]">
                {speciesLabels[speciesId] ?? tooltipData.speciesNames.get(speciesId) ?? speciesId}
              </span>
              <span className="ml-auto pl-2 tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;
