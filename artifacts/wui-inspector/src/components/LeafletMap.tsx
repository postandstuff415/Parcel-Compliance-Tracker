import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
  lat: number;
  lng: number;
}

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 18);
  }, [lat, lng, map]);
  return null;
}

export default function LeafletMap({ lat, lng }: LeafletMapProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[lat, lng]}
        zoom={18}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite (Mock)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topo">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapUpdater lat={lat} lng={lng} />

        <Marker position={[lat, lng]} />

        {/* Zone 0: 5m Ember-Resistant */}
        <Circle center={[lat, lng]} radius={5} pathOptions={{ color: "#DC2626", fillColor: "#DC2626", fillOpacity: 0.2, weight: 2 }} />
        {/* Zone 1: 30m Lean & Clean */}
        <Circle center={[lat, lng]} radius={30} pathOptions={{ color: "#D97706", fillColor: "#D97706", fillOpacity: 0.1, weight: 2 }} />
        {/* Zone 2: 100m Fuel Reduction */}
        <Circle center={[lat, lng]} radius={100} pathOptions={{ color: "#16A34A", fillColor: "#16A34A", fillOpacity: 0.05, weight: 2 }} />
      </MapContainer>
      
      {/* NDVI Legend Mock */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 p-3 rounded-md text-xs font-mono z-[400] text-slate-200">
        <div className="font-bold mb-2">NDVI Fuel Load</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-red-600 rounded-full"></div> Zone 0 (0-5m)</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-amber-600 rounded-full"></div> Zone 1 (5-30m)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-full"></div> Zone 2 (30-100m)</div>
      </div>
    </div>
  );
}