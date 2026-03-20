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

export const selectionColors = ["#FF29B4", "#64BEFF", "#FFEE80"];

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [speciesLabels, setSpeciesLabels] = useState<Record<string, string>>({});
  const { allDetections, activeDetections, loading } = useDetections(selectedSpecies);
  const { setIsPlaybackBlocked } = useDatesContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAllDetections, setShowAllDetections] = useState(false);
  const [clusterActive, setClusterActive] = useState(false);
  const [clusterAll, setClusterAll] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
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

  const filteredAllDetections = useMemo(() => {
    // Remove species that the user has deselected, without waiting for the fetch to finish
    return allDetections.filter((d) => selectedSpecies.includes(d.species.id));
  }, [allDetections, selectedSpecies.join(",")]);

  const filteredActiveDetections = useMemo(() => {
    // Remove species that the user has deselected, without waiting for the fetch to finish
    return activeDetections.filter((d) => selectedSpecies.includes(d.species.id));
  }, [activeDetections, selectedSpecies.join(",")]);

  return (
    <div ref={containerRef} className="flex flex-col h-full relative bg-black" data-popup-container>
      <div className="relative grow flex flex-col">
        <MapLoadingIndicator loading={loading} />
        <div className="absolute top-4 left-4 z-10 flex items-start gap-4 pointer-events-none">
          <SpeciesDropdown
            selectedSpecies={selectedSpecies}
            onChangeSpecies={setSelectedSpecies}
            onSpeciesLabelsChange={setSpeciesLabels}
            speciesColors={speciesColors}
          />
          <LayersDropdown
            showAllDetections={showAllDetections}
            onToggleAllDetections={setShowAllDetections}
            clusterActive={clusterActive}
            onToggleClusterActive={setClusterActive}
            clusterAll={clusterAll}
            onToggleClusterAll={setClusterAll}
            open={optionsOpen}
            onOpenChange={setOptionsOpen}
          />
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
          allDetections={filteredAllDetections}
          activeDetections={filteredActiveDetections}
          selectedSpecies={selectedSpecies}
          speciesColors={speciesColors}
          showAllDetections={showAllDetections}
          clusterActive={clusterActive}
          clusterAll={clusterAll}
        />
      </div>
      <Timeline
        showAllDetections={showAllDetections}
        onToggleAllDetections={setShowAllDetections}
        clusterActive={clusterActive}
        onToggleClusterActive={setClusterActive}
        clusterAll={clusterAll}
        onToggleClusterAll={setClusterAll}
        allDetections={filteredAllDetections}
        speciesColors={speciesColors}
        speciesLabels={speciesLabels}
        onToggleOptions={() => { setOptionsOpen((v) => !v); }}
      />
    </div>
  );
}

export default App;
