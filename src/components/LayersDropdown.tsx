import { Checkbox, Collapse } from "antd";
import { useEffect, useState } from "react";
import { useMapContext } from "./MapProvider.tsx";

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

const LayersDropdown = () => {
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const { map } = useMapContext();

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
      className="z-10 bg-light rounded-xs w-68 text-sm pointer-events-auto"
      classNames={{ body: "max-h-96 overflow-auto", header: "border-b-0" }}
      items={[
        {
          key: "1",
          label: <h2 className="text-base">Informationsschichten</h2>,
          children: (
            <>
              <p className="mb-4">
                Wählen Sie die Informationsschicht aus, die Sie sehen möchten.
              </p>

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
