import Plot from "react-plotly.js";
import { Rnd } from "react-rnd";

function RndPlotWrapper({ id, bringToFront, minimizeChart, minimizedCharts, title, plot, xLabel, yLabel }) {
  if (minimizedCharts.includes(id)) {
    return null;
  }
  
  return (
    <Rnd
      key={id}
      default={{ x: 100, y: 100, width: 900, height: 480 }}
      bounds="window"
      minWidth={420}
      minHeight={260}
      dragHandleClassName="drag-handle"
      style={{
        background: "#1a1a1a",
        borderRadius: 14,
        border: "1px solid #333",
        boxShadow: "0 0 12px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
      onMouseDown={() => bringToFront(id)}
    >
      <div
        className="drag-handle"
        style={{
        background: "#222",
        color: "#00b4d8",
        padding: "8px 12px",
        cursor: "grab",
        fontWeight: 600,
        fontSize: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        }}
      >
        {title}
        <button onClick={() => minimizeChart(id)} style={{
            background: "transparent",
            border: "none",
            color: "#ff5555",
            fontSize: "18px",
            cursor: "pointer",
            fontWeight: "bold",
        }}>✕</button>
      </div>

      <div style={{ height: "calc(100% - 42px)", padding: 8 }}>
        <Plot
          data={plot}
          layout={{
            autosize: true,
            paper_bgcolor: "#1a1a1a",
            plot_bgcolor: "#1a1a1a",
            font: { color: "#ccc" },
            hovermode: "x unified",
            dragmode: "zoom",
            margin: { l: 60, r: 30, t: 20, b: 60 },
            xaxis: { title: xLabel, showgrid: false },
            yaxis: { title: yLabel, gridcolor: "#333" },
            hoverlabel: {
            bgcolor: "#111",
            bordercolor: "#00b4d8",
            font: { color: "#fff" },
            },
            legend: {
            orientation: "h",
            y: -0.25,
            x: 0,
            font: { color: "#ccc" },
            },
          }}
          config={{ responsive: true, displaylogo: false, scrollZoom: false }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </Rnd>
  );
}

export default RndPlotWrapper;