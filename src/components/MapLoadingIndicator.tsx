import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export const MapLoadingIndicator = ({ loading }: { loading: boolean }) => {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="bg-black/40 backdrop-blur-md text-white px-8 py-4 rounded-lg shadow-lg flex items-center gap-3 border border-white/15">
        <Spin
          indicator={
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          }
        />
        <span className="text-base font-medium">Wird geladen...</span>
      </div>
    </div>
  );
};
