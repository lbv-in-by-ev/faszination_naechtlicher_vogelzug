import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "./components/map/Map.tsx";
import Timeline from "./components/Timeline";
import { useDetections } from "./api/useDetections.ts";
import SpeciesDropdown from "./components/SpeciesDropdown.tsx";
import { MapLoadingIndicator } from "./components/MapLoadingIndicator.tsx";
import { usePersistentColors } from "./lib/usePersistentColors.ts";
import LayersDropdown from "./components/LayersDropdown.tsx";
import { useDatesContext } from "./components/DatesProvider.tsx";
import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";

export const selectionColors = ["#FF29B4", "#64BEFF", "#00FFCC", "#FFD700"];

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const { data: detections, loading } = useDetections(selectedSpecies);
  const { setIsPlaybackBlocked } = useDatesContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsPlaybackBlocked(loading);
  }, [loading, setIsPlaybackBlocked]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      containerRef.current.requestFullscreen().catch(console.error);
    }
  }, []);

  const speciesColors = usePersistentColors(selectedSpecies, selectionColors);

  const filteredDetections = useMemo(() => {
    // Remove species that the user has deselected, without waiting for the fetch to finish
    return detections.filter((d) => selectedSpecies.includes(d.species.id));
  }, [detections, selectedSpecies.join(",")]);

  return (
    <div ref={containerRef} className="flex flex-col h-full relative bg-black">
      <MapLoadingIndicator loading={loading} />
      <div className="absolute top-4 left-4 z-10 flex items-start gap-4 pointer-events-none">
        <SpeciesDropdown
          selectedSpecies={selectedSpecies}
          onChangeSpecies={setSelectedSpecies}
          speciesColors={speciesColors}
        />
        <LayersDropdown />
      </div>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded border border-white/20 transition-colors"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <FullscreenExitOutlined style={{ fontSize: 18 }} />
        ) : (
          <FullscreenOutlined style={{ fontSize: 18 }} />
        )}
      </button>
      <Map
        detections={filteredDetections}
        selectedSpecies={selectedSpecies}
        speciesColors={speciesColors}
      />
      <Timeline />
    </div>
  );
}

export default App;
