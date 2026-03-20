import { Checkbox, Collapse } from "antd";
import { useEffect, useState } from "react";
import { useMapContext } from "./MapProvider.tsx";
import { useDatesContext } from "./DatesProvider.tsx";

const layers = [
  {
    label: "Lichtverschmutzung",
    layers: ["light-pollution-layer"],
  },
  {
    label: "Lärmkartierung",
    layers: [
      "lfu-laerm-strassen-lden-2022-layer",
      "lfu-hauptstrassen-lden-2022-layer",
    ],
  },
  // {
  //   label: "Vogelschlag",
  //   layers: [],
  // },
];

interface LayersDropdownProps {
  showAllDetections: boolean;
  onToggleAllDetections: (value: boolean) => void;
  clusterActive: boolean;
  onToggleClusterActive: (value: boolean) => void;
  clusterAll: boolean;
  onToggleClusterAll: (value: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LayersDropdown: React.FC<LayersDropdownProps> = ({
  showAllDetections,
  onToggleAllDetections,
  clusterActive,
  onToggleClusterActive,
  clusterAll,
  onToggleClusterAll,
  open,
  onOpenChange,
}) => {
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const { map } = useMapContext();
  const { isNightOnly, setIsNightOnly } = useDatesContext();

  useEffect(() => {
    if (!map) return;

    layers.forEach((group) => {
      const isVisible = activeLayers.includes(group.label);

      group.layers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(
            layerId,
            "visibility",
            isVisible ? "visible" : "none",
          );
        }
      });
    });
  }, [map, activeLayers]);

  return (
    <Collapse
      collapsible="header"
      activeKey={open ? ["1"] : []}
      onChange={(keys) => { onOpenChange(keys.includes("1")); }}
      className="z-10 bg-light rounded-xs w-68 text-sm pointer-events-auto"
      classNames={{ body: "max-h-96 overflow-auto", header: "border-b-0" }}
      items={[
        {
          key: "1",
          label: <h2 className="text-base">Optionen</h2>,
          children: (
            <>
              <div className="flex flex-col gap-3 mb-4">
                <Checkbox
                  checked={isNightOnly}
                  classNames={{ icon: "text-amber-400" }}
                  onChange={(e) => { setIsNightOnly(e.target.checked); }}
                >
                  Nur Nächte zeigen
                </Checkbox>
                <Checkbox
                  checked={clusterActive}
                  classNames={{ icon: "text-amber-400" }}
                  onChange={(e) => { onToggleClusterActive(e.target.checked); }}
                >
                  Aktive Detektionen gruppieren
                </Checkbox>
                <Checkbox
                  checked={showAllDetections}
                  classNames={{ icon: "text-amber-400" }}
                  onChange={(e) => { onToggleAllDetections(e.target.checked); }}
                >
                  Alle Detektionen im ausgewählten Zeitraum
                </Checkbox>
                <Checkbox
                  checked={clusterAll}
                  classNames={{ icon: "text-amber-400" }}
                  onChange={(e) => { onToggleClusterAll(e.target.checked); }}
                >
                  Alle Detektionen gruppieren
                </Checkbox>
              </div>

              <h3 className="text-sm font-medium mb-2">Informationsschichten</h3>

              <ul className="list-none">
                {layers.map((layer) => {
                  const isSelected = activeLayers.includes(layer.label);
                  return (
                    <li key={layer.label} className={`mb-2 last:mb-0 `}>
                      <Checkbox
                        checked={isSelected}
                        classNames={{ icon: "text-amber-400" }}
                        onChange={() => {
                          if (isSelected) {
                            setActiveLayers(
                              activeLayers.filter((l) => l !== layer.label),
                            );
                          } else {
                            setActiveLayers([...activeLayers, layer.label]);
                          }
                        }}
                      >
                        {layer.label}
                      </Checkbox>
                    </li>
                  );
                })}
              </ul>
            </>
          ),
        },
      ]}
    />
  );
};

export default LayersDropdown;
