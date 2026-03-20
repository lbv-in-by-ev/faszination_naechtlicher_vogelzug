import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "./components/map/Map.tsx";
import Timeline from "./components/Timeline";
import { useDetections } from "./api/useDetections.ts";
import SpeciesDropdown from "./components/SpeciesDropdown.tsx";
import { MapLoadingIndicator } from "./components/MapLoadingIndicator.tsx";
import { usePersistentColors } from "./lib/usePersistentColors.ts";
import LayersDropdown from "./components/LayersDropdown.tsx";
import { useDatesContext } from "./components/DatesProvider.tsx";
import { FullscreenOutlined, FullscreenExitOutlined, CloseOutlined } from "@ant-design/icons";

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
  const [speciesOpen, setSpeciesOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"species" | "options">("species");
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
        {/* Desktop panels (hidden on mobile — use modal instead) */}
        <div className="absolute top-4 left-4 z-10 flex items-start gap-4 pointer-events-none compact:hidden">
          <SpeciesDropdown
            selectedSpecies={selectedSpecies}
            onChangeSpecies={setSelectedSpecies}
            onSpeciesLabelsChange={setSpeciesLabels}
            speciesColors={speciesColors}
            open={speciesOpen}
            onOpenChange={setSpeciesOpen}
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
      {/* Mobile modal — direct child of containerRef so absolute fills the app, not the viewport */}
      {mobileMenuOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-end justify-between border-b border-white/10">
            <div className="flex">
              <button
                type="button"
                className={`px-5 pt-4 pb-3 text-sm font-medium transition-colors ${mobileTab === "species" ? "text-white border-b-2 border-white bg-white/5" : "text-white/40"}`}
                onClick={() => setMobileTab("species")}
              >
                Vogelarten
              </button>
              <button
                type="button"
                className={`px-5 pt-4 pb-3 text-sm font-medium transition-colors ${mobileTab === "options" ? "text-white border-b-2 border-white bg-white/5" : "text-white/40"}`}
                onClick={() => setMobileTab("options")}
              >
                Optionen
              </button>
            </div>
            <button
              type="button"
              className="p-4 text-white/40 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <CloseOutlined />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 text-white">
            {mobileTab === "species" ? (
              <SpeciesDropdown
                selectedSpecies={selectedSpecies}
                onChangeSpecies={setSelectedSpecies}
                onSpeciesLabelsChange={setSpeciesLabels}
                speciesColors={speciesColors}
                mode="plain"
              />
            ) : (
              <LayersDropdown
                showAllDetections={showAllDetections}
                onToggleAllDetections={setShowAllDetections}
                clusterActive={clusterActive}
                onToggleClusterActive={setClusterActive}
                clusterAll={clusterAll}
                onToggleClusterAll={setClusterAll}
                mode="plain"
              />
            )}
          </div>
        </div>
      )}
      <Timeline
        allDetections={filteredAllDetections}
        speciesColors={speciesColors}
        speciesLabels={speciesLabels}
        onToggleOptions={() => {
          if (window.innerWidth >= 640 && window.innerHeight >= 640) {
            // Desktop: toggle collapses
            if (speciesOpen && optionsOpen) {
              setSpeciesOpen(false);
              setOptionsOpen(false);
            } else {
              setSpeciesOpen(true);
              setOptionsOpen(true);
            }
          } else {
            // Mobile: toggle modal
            setMobileMenuOpen((v) => !v);
          }
        }}
      />
    </div>
  );
}

export default App;
