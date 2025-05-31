import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Tooltip as MuiTooltip,
  IconButton,
  Box,
  Stack
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MapIcon from "@mui/icons-material/Map";
import WifiIcon from "@mui/icons-material/Wifi";
import ApartmentIcon from "@mui/icons-material/Apartment";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AnimationIcon from "@mui/icons-material/Animation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Optional: disable default icons warning
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const FILE_URL = "https://signal-speed-bot.glitch.me/1MB.test"; // replace with your real download endpoint

const getSignalLevelIcon = (mbps: number): string => {
  if (mbps > 50) return "😸✨ Excellent";
  if (mbps > 20) return "😊⚡ Good";
  if (mbps > 5) return "😐 Fair";
  return "😣📴 Poor";
};

const measureDownloadSpeed = async (): Promise<{
  mbps: number;
  icon: string;
}> => {
  const start = performance.now();
  const response = await fetch(FILE_URL, { cache: "no-store" });
  const blob = await response.blob();
  const end = performance.now();

  const durationSeconds = (end - start) / 1000;
  const sizeMB = blob.size / (1024 * 1024);
  const mbps = (sizeMB * 8) / durationSeconds;

  return {
    mbps,
    icon: getSignalLevelIcon(mbps)
  };
};

const svgWidth = 400;
const svgHeight = 350;

// Calculate bounds from gpsTrail
function getBounds(trail: Array<{ lat: number; lon: number }>) {
  if (trail.length === 0) {
    // Default bounds if no data
    return {
      topLeft: { lat: 0, lon: 0 },
      bottomRight: { lat: 0, lon: 0 }
    };
  }
  let minLat = trail[0].lat,
    maxLat = trail[0].lat;
  let minLon = trail[0].lon,
    maxLon = trail[0].lon;
  for (const p of trail) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  // TopLeft: maxLat, minLon; BottomRight: minLat, maxLon
  return {
    topLeft: { lat: maxLat, lon: minLon },
    bottomRight: { lat: minLat, lon: maxLon }
  };
}

// Function to map GPS to SVG coordinates using dynamic bounds
function gpsToSvgCoords(
  lat: number,
  lon: number,
  topLeft: { lat: number; lon: number },
  bottomRight: { lat: number; lon: number }
) {
  const xRatio = (lon - topLeft.lon) / (bottomRight.lon - topLeft.lon || 1); // avoid divide by zero
  const yRatio = (lat - topLeft.lat) / (bottomRight.lat - topLeft.lat || 1); // avoid divide by zero

  return {
    x: xRatio * svgWidth,
    y: (1 - yRatio) * svgHeight // invert y for SVG
  };
}

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<"anime" | "graph">("anime");
  const [signalHistory, setSignalHistory] = useState<
    Array<{ mbps: number; icon: string; timestamp: string }>
  >([]);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);

  const [gpsTrail, setGpsTrail] = useState<
    Array<{ lat: number; lon: number; icon: string }>
  >([]);
  const [showMap, setShowMap] = useState(false);
  const [showBuildingMap, setShowBuildingMap] = useState(false);

  const checkSignal = async () => {
    const result = await measureDownloadSpeed();
    const now = new Date().toLocaleTimeString();

    setSignalHistory((prev) => [
      ...prev.slice(-4),
      { mbps: result.mbps, icon: result.icon, timestamp: now }
    ]);
    return result;
  };

  const distanceBetween = (
    loc1: GeolocationCoordinates,
    loc2: GeolocationCoordinates
  ) => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(loc2.latitude - loc1.latitude);
    const dLon = toRad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc1.latitude)) *
        Math.cos(toRad(loc2.latitude)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    navigator.geolocation.watchPosition((pos) => {
      const coords = pos.coords;
      if (!location || distanceBetween(location, coords) > 1) {
        setLocation(coords);
        checkSignal().then((result) => {
          if (result) {
            setGpsTrail((prev) => [
              ...prev,
              { lat: coords.latitude, lon: coords.longitude, icon: result.icon }
            ]);
          }
        });
      }
    });
    // eslint-disable-next-line
  }, [location]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        textAlign: "center",
        mt: 4,
        background: "#f7fafd",
        borderRadius: 3,
        boxShadow: 3,
        pb: 4,
        pt: 2
      }}
    >
      <Typography variant="h4" fontWeight={700} color="#1976d2" gutterBottom>
        SignalBot
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Wi-Fi / Mobile Signal Strength Monitor
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
        <MuiTooltip
          title={
            mode === "graph" ? "Switch to Anime Mode" : "Switch to Graph Mode"
          }
        >
          <IconButton
            color={mode === "graph" ? "primary" : "default"}
            onClick={() => setMode(mode === "graph" ? "anime" : "graph")}
            size="large"
          >
            {mode === "graph" ? <AnimationIcon /> : <ShowChartIcon />}
          </IconButton>
        </MuiTooltip>
        <MuiTooltip title={showMap ? "Show Signal View" : "Show Map View"}>
          <IconButton
            color={showMap ? "primary" : "default"}
            onClick={() => setShowMap((prev) => !prev)}
            size="large"
          >
            {showMap ? <WifiIcon /> : <MapIcon />}
          </IconButton>
        </MuiTooltip>
        <MuiTooltip
          title={showBuildingMap ? "Show Outdoor Map" : "Show Building Map"}
        >
          <IconButton
            color={showBuildingMap ? "primary" : "default"}
            onClick={() => setShowBuildingMap((prev) => !prev)}
            size="large"
            disabled={!showMap}
          >
            <ApartmentIcon />
          </IconButton>
        </MuiTooltip>
        <MuiTooltip title="Recheck Now">
          <IconButton color="success" onClick={checkSignal} size="large">
            <RefreshIcon />
          </IconButton>
        </MuiTooltip>
      </Stack>

      {mode === "anime" ? (
        <Paper sx={{ mt: 2, p: 3, borderRadius: 2, background: "#e3f2fd" }}>
          {signalHistory.length > 0 && (
            <Typography variant="h3" mt={2} fontWeight={600}>
              {signalHistory.at(-1)?.icon}
            </Typography>
          )}
        </Paper>
      ) : (
        <Paper sx={{ mt: 2, p: 2, borderRadius: 2, background: "#e3f2fd" }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signalHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="mbps" stroke="#1976d2" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Building (Indoor) Map */}
      {showMap && showBuildingMap && (
        <Paper
          sx={{ height: 400, mt: 3, position: "relative", borderRadius: 2 }}
        >
          <Typography variant="h6" sx={{ pt: 2, color: "#1976d2" }}>
            Building Indoor Map (Realistic)
          </Typography>
          <svg
            width="100%"
            height="350"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ background: "#f5f5f5" }}
          >
            {/* Example: Draw rooms/walls */}
            <rect
              x="50"
              y="50"
              width="300"
              height="200"
              fill="#e0e0e0"
              stroke="#888"
              strokeWidth="2"
            />
            <rect
              x="70"
              y="70"
              width="80"
              height="60"
              fill="#fff"
              stroke="#888"
            />
            <rect
              x="170"
              y="70"
              width="160"
              height="60"
              fill="#fff"
              stroke="#888"
            />
            <rect
              x="70"
              y="150"
              width="260"
              height="80"
              fill="#fff"
              stroke="#888"
            />
            {/* Plot trail as red/green dots using real GPS mapped to SVG */}
            {(() => {
              const bounds = getBounds(gpsTrail);
              return gpsTrail.map((p, i) => {
                let color = "gray";
                if (p.icon.includes("Excellent") || p.icon.includes("Good"))
                  color = "rgba(76, 175, 80, 0.5)"; // green
                if (p.icon.includes("Fair") || p.icon.includes("Poor"))
                  color = "rgba(244, 67, 54, 0.5)"; // red

                const { x, y } = gpsToSvgCoords(
                  p.lat,
                  p.lon,
                  bounds.topLeft,
                  bounds.bottomRight
                );
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="18"
                    fill={color}
                    stroke={color === "gray" ? "#888" : undefined}
                  >
                    <title>{p.icon}</title>
                  </circle>
                );
              });
            })()}
          </svg>
        </Paper>
      )}

      {/* Outdoor Map */}
      {showMap && location && !showBuildingMap && (
        <Paper sx={{ height: 400, mt: 3, borderRadius: 2 }}>
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={25}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", borderRadius: "8px" }}
          >
            <RecenterMap lat={location.latitude} lon={location.longitude} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            <Polyline
              positions={gpsTrail.map((p) => [p.lat, p.lon])}
              color="blue"
            />
            {gpsTrail.map((p, index) => (
              <Marker key={index} position={[p.lat, p.lon]}>
                <Popup>
                  Signal: {p.icon}
                  <br />
                  Lat: {p.lat.toFixed(5)}, Lon: {p.lon.toFixed(5)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Paper>
      )}
    </Container>
  );
};

export default App;
