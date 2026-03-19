import dayjs, { type Dayjs } from "dayjs";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useMemo,
  useState,
  useEffect,
  use,
} from "react";
import { getTimes } from "suncalc";

interface ContextValues {
  dateRange: { from: Dayjs; to: Dayjs };
  visualisationTimeRange: { from: Dayjs; to: Dayjs };
  timeSegments: TimeSegment[];
  totalMinutes: number;
  currentSliderMinute: number;
  windowSize: number;
  isNightOnly: boolean;
  isPlaying: boolean;
  isPlaybackBlocked: boolean;

  handleDateRangeChange: (newRange: { from: Dayjs; to: Dayjs }) => void;
  setSliderMinute: (minute: number) => void;
  setWindowSize: (minutes: number) => void;
  setIsNightOnly: (isNightOnly: boolean) => void;
  togglePlay: () => void;
  setIsPlaybackBlocked: (blocked: boolean) => void;
}

const PLAYBACK_SPEED_MS = 300;
const PLAYBACK_STEP_MINUTES = 1;

export const DatesContext = createContext<ContextValues | null>(null);
const sunCalcCoordinates: [number, number] = [49.018624, 12.095446];

export interface TimeSegment {
  start: Dayjs;
  end: Dayjs;
  durationMinutes: number;
  accumulatedStart: number;
}

const DatesProvider = ({ children }: PropsWithChildren) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);
  const [isNightOnly, setIsNightOnly] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: dayjs().subtract(1, "day").startOf("hour"),
    to: dayjs().startOf("hour"),
  });

  const [windowSize, setWindowSize] = useState(1);
  const [currentSliderMinute, setCurrentSliderMinute] = useState(0);
  // current time range that is used for visualisation on map
  const [visualisationTimeRange, setVisualisationTimeRange] = useState({
    from: dateRange.from,
    to: dateRange.from.add(windowSize, "minute"),
  });

  const timeSegments = useMemo<TimeSegment[]>(() => {
    const segments: TimeSegment[] = [];

    if (!isNightOnly) {
      segments.push({
        start: dateRange.from,
        end: dateRange.to,
        durationMinutes: dateRange.to.diff(dateRange.from, "minute"),
        accumulatedStart: 0,
      });
    } else {
      let currentDayLoop = dateRange.from.startOf("day");
      let accumulated = 0;

      while (currentDayLoop.isBefore(dateRange.to)) {
        // Pass noon (local) to suncalc so it sees the correct UTC calendar day.
        // Midnight local in UTC+1 is 23:00 UTC the previous day, which would
        // cause suncalc to compute times for the wrong day.
        const sunTimesToday = getTimes(
          currentDayLoop.hour(12).toDate(),
          ...sunCalcCoordinates,
        );
        const sunsetToday = dayjs(sunTimesToday.sunset);

        const nextDay = currentDayLoop.add(1, "day");
        const sunTimesTomorrow = getTimes(
          nextDay.hour(12).toDate(),
          ...sunCalcCoordinates,
        );
        const sunriseTomorrow = dayjs(sunTimesTomorrow.dawn);

        // Clamping to user selected range
        const effectiveStart = sunsetToday.isBefore(dateRange.from)
          ? dateRange.from
          : sunsetToday;
        const effectiveEnd = sunriseTomorrow.isAfter(dateRange.to)
          ? dateRange.to
          : sunriseTomorrow;

        if (effectiveStart.isBefore(effectiveEnd)) {
          const duration = effectiveEnd.diff(effectiveStart, "minute");
          segments.push({
            start: effectiveStart,
            end: effectiveEnd,
            durationMinutes: duration,
            accumulatedStart: accumulated,
          });
          accumulated += duration;
        }
        currentDayLoop = nextDay;
      }
    }
    return segments;
  }, [dateRange.from.valueOf(), dateRange.to.valueOf(), isNightOnly]);

  // Total duration for the slider display
  const totalMinutes = useMemo(() => {
    return timeSegments.reduce((acc, seg) => acc + seg.durationMinutes, 0);
  }, [timeSegments]);

  const setSliderMinute = useCallback(
    (virtualMinute: number) => {
      if (timeSegments.length === 0) return;

      const clampedMinute = Math.max(0, Math.min(virtualMinute, totalMinutes));
      setCurrentSliderMinute(clampedMinute);

      // get current segment
      const segment = timeSegments.find(
        (seg) =>
          clampedMinute >= seg.accumulatedStart &&
          clampedMinute < seg.accumulatedStart + seg.durationMinutes,
      );

      // take last segment if no segment is found
      const activeSegment = segment ?? timeSegments[timeSegments.length - 1];

      const offsetInSegment = Math.min(
        clampedMinute - activeSegment.accumulatedStart,
        activeSegment.durationMinutes,
      );

      const newStart = activeSegment.start.add(offsetInSegment, "minute");
      let newEnd = newStart.add(windowSize, "minute");

      // end at segment end, do not leak into the next segment
      if (newEnd.isAfter(activeSegment.end)) {
        newEnd = activeSegment.end;
      }

      if (
        visualisationTimeRange.from.valueOf() !== newStart.valueOf() ||
        visualisationTimeRange.to.valueOf() !== newEnd.valueOf()
      ) {
        setVisualisationTimeRange({ from: newStart, to: newEnd });
      }
    },
    [timeSegments, totalMinutes, windowSize],
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const willPlay = !prev;
      // restart loop
      if (willPlay && currentSliderMinute >= totalMinutes) {
        setSliderMinute(0);
      }
      return willPlay;
    });
  }, [currentSliderMinute, totalMinutes, setSliderMinute]);

  useEffect(() => {
    let timer: number;

    if (isPlaying && !isPlaybackBlocked) {
      timer = setTimeout(() => {
        const nextMinute = currentSliderMinute + PLAYBACK_STEP_MINUTES;

        if (nextMinute >= totalMinutes) {
          // final minute reached
          setSliderMinute(totalMinutes);
          setIsPlaying(false);
        } else {
          setSliderMinute(nextMinute);
        }
      }, PLAYBACK_SPEED_MS);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isPlaying, isPlaybackBlocked, currentSliderMinute, totalMinutes, setSliderMinute]);

  useEffect(() => {
    if (timeSegments.length === 0) {
      setCurrentSliderMinute(0);
      setVisualisationTimeRange({ from: dateRange.from, to: dateRange.to });
      return;
    }
    // reset slider back to 0
    setSliderMinute(0);
  }, [totalMinutes]);

  const handleDateRangeChange = useCallback(
    (newRange: { from: Dayjs; to: Dayjs }) => {
      setDateRange(newRange);
    },
    [],
  );

  const contextValue = useMemo<ContextValues>(
    () => ({
      dateRange,
      visualisationTimeRange,
      timeSegments,
      totalMinutes,
      currentSliderMinute,
      windowSize,
      isNightOnly,
      isPlaying,
      isPlaybackBlocked,
      handleDateRangeChange,
      setSliderMinute,
      setWindowSize,
      setIsNightOnly,
      togglePlay,
      setIsPlaybackBlocked,
    }),
    [
      dateRange,
      visualisationTimeRange,
      timeSegments,
      totalMinutes,
      currentSliderMinute,
      windowSize,
      isNightOnly,
      isPlaying,
      isPlaybackBlocked,
      handleDateRangeChange,
      setSliderMinute,
      setWindowSize,
      setIsNightOnly,
      togglePlay,
      setIsPlaybackBlocked,
    ],
  );

  return <DatesContext value={contextValue}>{children}</DatesContext>;
};

export default DatesProvider;

export const useDatesContext = () => {
  const object = use(DatesContext);
  if (!object) {
    throw new Error("useDatesContext must be used within a Provider");
  }
  return object;
};
