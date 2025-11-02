export const getGenericPlotData = (data, yLabel, color = "#00b4d8") => {
  return {
    x: data?.map((d) => d.period) ?? [],
    y: data?.map((d) => d.value) ?? [],
    type: "scatter",
    mode: "lines",
    line: { color, width: 2 },
    hovertemplate: `<b>Date:</b> %{x}<br><b>${yLabel}:</b> %{y:.2f}<extra></extra>`,
  };
}