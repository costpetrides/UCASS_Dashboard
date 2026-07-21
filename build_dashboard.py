#!/usr/bin/env python3
"""Scan date folders and regenerate index.html from available PNG figures."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

PLOT_TITLES = {
    "combined/combined_FIDAS_UCASS_TSI_dN_dlnDp.png": "Combined FIDAS UCASS TSI dN/dlnDp",
    "combined/wind_direction/mean_dN_dlnDp_WD_E.png": "Wind Direction E",
    "combined/wind_direction/mean_dN_dlnDp_WD_N.png": "Wind Direction N",
    "combined/wind_direction/mean_dN_dlnDp_WD_NE.png": "Wind Direction NE",
    "combined/wind_direction/mean_dN_dlnDp_WD_NW.png": "Wind Direction NW",
    "combined/wind_direction/mean_dN_dlnDp_WD_S.png": "Wind Direction S",
    "combined/wind_direction/mean_dN_dlnDp_WD_SE.png": "Wind Direction SE",
    "combined/wind_direction/mean_dN_dlnDp_WD_SW.png": "Wind Direction SW",
    "combined/wind_direction/mean_dN_dlnDp_WD_W.png": "Wind Direction W",
    "combined/wind_speed/mean_dN_dlnDp_WS_0_2.png": "Wind Speed 0 2",
    "combined/wind_speed/mean_dN_dlnDp_WS_10_12.png": "Wind Speed 10 12",
    "combined/wind_speed/mean_dN_dlnDp_WS_2_4.png": "Wind Speed 2 4",
    "combined/wind_speed/mean_dN_dlnDp_WS_4_6.png": "Wind Speed 4 6",
    "combined/wind_speed/mean_dN_dlnDp_WS_6_8.png": "Wind Speed 6 8",
    "combined/wind_speed/mean_dN_dlnDp_WS_8_10.png": "Wind Speed 8 10",
    "combined/wind_speed/mean_dN_dlnDp_WS_gt_4.png": "Wind Speed Gt 4",
    "combined/wind_speed/mean_dN_dlnDp_WS_lt_4.png": "Wind Speed Lt 4",
    "map.png": "Map",
    "ScatterPlots/UCASS_multi_bin_intercomparison_scatter_10min.png": "UCASS multi-bin intercomparison scatter (10 min)",
    "ScatterPlots/UCASS_multi_bin_intercomparison_scatter_5min.png": "UCASS multi-bin intercomparison scatter (5 min)",
    "ScatterPlots/UCASS_multi_bin_intercomparison_scatter_5min_by_wind_2ms.png": "UCASS multi-bin intercomparison scatter (5 min, wind < 2 m/s)",
    "wind/air_temperature_timeseries.png": "Air Temperature Timeseries",
    "wind/atmospheric_pressure_timeseries.png": "Atmospheric Pressure Timeseries",
    "wind/correlation_heatmap.png": "Correlation Heatmap",
    "wind/daily_hourly_wind_speed_heatmap.png": "Daily Hourly Wind Speed Heatmap",
    "wind/diurnal_wind_direction.png": "Diurnal Wind Direction",
    "wind/diurnal_wind_speed.png": "Diurnal Wind Speed",
    "wind/monthly_wind_speed.png": "Monthly Wind Speed",
    "wind/relative_humidity_timeseries.png": "Relative Humidity Timeseries",
    "wind/u_component_timeseries.png": "u Component Timeseries",
    "wind/v_component_timeseries.png": "v Component Timeseries",
    "wind/wind_direction_histogram.png": "Wind Direction Histogram",
    "wind/wind_direction_polar.png": "Wind Direction Polar",
    "wind/wind_direction_timeseries.png": "Wind Direction Timeseries",
    "wind/wind_rose.png": "Wind Rose",
    "wind/wind_speed_histogram.png": "Wind Speed Histogram",
    "wind/wind_speed_timeseries.png": "Wind Speed Timeseries",
    "wind/wind_speed_weibull_fit.png": "Wind Speed Weibull Fit",
}

OVERVIEW_TITLE = "Combined PSD — FIDAS, UCASS 1/2/6, TSI"
COMBINED_TITLE = "FIDAS vs UCASS vs TSI (dN/dlnDp)"
COMBINED_PSD = "combined/combined_FIDAS_UCASS_TSI_dN_dlnDp.png"

WIND_SPEED_ORDER = [
    "mean_dN_dlnDp_WS_0_2.png",
    "mean_dN_dlnDp_WS_2_4.png",
    "mean_dN_dlnDp_WS_4_6.png",
    "mean_dN_dlnDp_WS_6_8.png",
    "mean_dN_dlnDp_WS_8_10.png",
    "mean_dN_dlnDp_WS_10_12.png",
    "mean_dN_dlnDp_WS_gt_4.png",
    "mean_dN_dlnDp_WS_lt_4.png",
]

WIND_DIR_ORDER = [
    "mean_dN_dlnDp_WD_N.png",
    "mean_dN_dlnDp_WD_NE.png",
    "mean_dN_dlnDp_WD_E.png",
    "mean_dN_dlnDp_WD_SE.png",
    "mean_dN_dlnDp_WD_S.png",
    "mean_dN_dlnDp_WD_SW.png",
    "mean_dN_dlnDp_WD_W.png",
    "mean_dN_dlnDp_WD_NW.png",
]

SCATTER_ORDER = [
    "UCASS_multi_bin_intercomparison_scatter_10min.png",
    "UCASS_multi_bin_intercomparison_scatter_5min.png",
    "UCASS_multi_bin_intercomparison_scatter_5min_by_wind_2ms.png",
]

WIND_ORDER = [
    "air_temperature_timeseries.png",
    "atmospheric_pressure_timeseries.png",
    "correlation_heatmap.png",
    "daily_hourly_wind_speed_heatmap.png",
    "diurnal_wind_direction.png",
    "diurnal_wind_speed.png",
    "monthly_wind_speed.png",
    "relative_humidity_timeseries.png",
    "u_component_timeseries.png",
    "v_component_timeseries.png",
    "wind_direction_histogram.png",
    "wind_direction_polar.png",
    "wind_direction_timeseries.png",
    "wind_rose.png",
    "wind_speed_histogram.png",
    "wind_speed_timeseries.png",
    "wind_speed_weibull_fit.png",
]

CSS = (ROOT / "dashboard.css").read_text(encoding="utf-8")
JS = (ROOT / "dashboard.js").read_text(encoding="utf-8")


def date_key(label: str) -> tuple[int, int, int]:
    day, month, year = label.split(".")
    return (2000 + int(year), int(month), int(day))


def slug_from_label(label: str) -> str:
    return label.replace(".", "-")


def title_for(path: str) -> str:
    if path in PLOT_TITLES:
        return PLOT_TITLES[path]
    name = Path(path).name.replace(".png", "")
    name = name.replace("_", " ")
    name = re.sub(r"\bWd\b", "WD", name, flags=re.I)
    name = re.sub(r"\bWs\b", "WS", name, flags=re.I)
    return name.title()


def discover_campaigns() -> list[str]:
    campaigns: list[str] = []
    for entry in ROOT.iterdir():
        if not entry.is_dir():
            continue
        if entry.name.startswith("."):
            continue
        if (entry / "figures").is_dir():
            campaigns.append(entry.name)
    campaigns.sort(key=date_key)
    return campaigns


def scan_plots(campaign: str) -> list[str]:
    figures_dir = ROOT / campaign / "figures"
    plots: list[str] = []
    for png in figures_dir.rglob("*.png"):
        rel = png.relative_to(figures_dir).as_posix()
        plots.append(rel)
    plots.sort()
    return plots


def ordered_subset(plots: set[str], prefix: str, filenames: list[str]) -> list[str]:
    return [f"{prefix}{name}" for name in filenames if f"{prefix}{name}" in plots]


def plot_card(campaign: str, rel_path: str, card_title: str) -> str:
    src = f"{html.escape(campaign)}/figures/{html.escape(rel_path)}"
    path_attr = html.escape(rel_path, quote=True)
    date_attr = html.escape(campaign, quote=True)
    title = html.escape(card_title)
    return f"""        <div class="plot-card" data-plot-path="{path_attr}" data-campaign-date="{date_attr}">
          <div class="plot-card-header">
            <h4>{title}</h4>
            <button type="button" class="compare-plot-btn" data-plot-path="{path_attr}">Compare</button>
          </div>
          <img src="{src}" alt="{title}" class="figure" loading="lazy"/>
        </div>"""


def grid_cards(campaign: str, paths: list[str]) -> str:
    if not paths:
        return ""
    cards = "\n".join(plot_card(campaign, path, title_for(path)) for path in paths)
    return f"""        <div class="grid-2">
{cards}
        </div>"""


def build_campaign_panel(campaign: str, plots: list[str]) -> str:
    slug = slug_from_label(campaign)
    plot_set = set(plots)

    has_combined_psd = COMBINED_PSD in plot_set
    wind_speed = ordered_subset(plot_set, "combined/wind_speed/", WIND_SPEED_ORDER)
    wind_direction = ordered_subset(plot_set, "combined/wind_direction/", WIND_DIR_ORDER)
    scatter = ordered_subset(plot_set, "ScatterPlots/", SCATTER_ORDER)
    has_map = "map.png" in plot_set
    wind_plots = ordered_subset(plot_set, "wind/", WIND_ORDER)

    has_combined = has_combined_psd or wind_speed or wind_direction
    has_wind = has_map or wind_plots

    tabs: list[tuple[str, str]] = []
    if has_combined_psd:
        tabs.append(("overview", "Overview"))
    if has_combined:
        tabs.append(("combined", "Combined aerosol"))
    if scatter:
        tabs.append(("scatter", "Scatter plots"))
    if has_wind:
        tabs.append(("wind", "Meteorology"))

    if not tabs:
        tabs.append(("overview", "Overview"))

    tab_buttons = "\n".join(
        f'      <button type="button" class="tab-btn" data-target="{kind}-{slug}">{label}</button>'
        for kind, label in tabs
    )

    sections: list[str] = []

    if has_combined_psd:
        sections.append(
            f"""      <section id="overview-{slug}" class="tab-panel">
{plot_card(campaign, COMBINED_PSD, OVERVIEW_TITLE)}
      </section>"""
        )

    if has_combined:
        combined_parts = []
        if has_combined_psd:
            combined_parts.append(plot_card(campaign, COMBINED_PSD, COMBINED_TITLE))
        if wind_speed:
            combined_parts.append("        <h3>By wind speed</h3>")
            combined_parts.append(grid_cards(campaign, wind_speed))
        if wind_direction:
            combined_parts.append("        <h3>By wind direction</h3>")
            combined_parts.append(grid_cards(campaign, wind_direction))
        sections.append(
            f"""      <section id="combined-{slug}" class="tab-panel">
{chr(10).join(combined_parts)}
      </section>"""
        )

    if scatter:
        sections.append(
            f"""      <section id="scatter-{slug}" class="tab-panel">
{grid_cards(campaign, scatter)}
      </section>"""
        )

    if has_wind:
        wind_parts = []
        if has_map:
            wind_parts.append(plot_card(campaign, "map.png", title_for("map.png")))
        if wind_plots:
            wind_parts.append(grid_cards(campaign, wind_plots))
        sections.append(
            f"""      <section id="wind-{slug}" class="tab-panel">
{chr(10).join(wind_parts)}
      </section>"""
        )

    if not sections:
        sections.append(
            f"""      <section id="overview-{slug}" class="tab-panel">
        <p class="compare-empty" style="padding:0">No figures found for this date.</p>
      </section>"""
        )

    return f"""  <div id="campaign-{slug}" class="campaign-panel">
    <nav class="tabs">
{tab_buttons}
    </nav>
    <main>
{chr(10).join(sections)}
    </main>
  </div>"""


def build_plot_catalog(campaigns: dict[str, list[str]]) -> str:
    all_plots: dict[str, str] = {}
    for plots in campaigns.values():
        for path in plots:
            all_plots.setdefault(path, title_for(path))

    catalog = {
        "campaigns": list(campaigns.keys()),
        "plots": all_plots,
        "availability": campaigns,
    }
    return json.dumps(catalog, ensure_ascii=False)


def build_html() -> str:
    campaigns_list = discover_campaigns()
    campaigns: dict[str, list[str]] = {c: scan_plots(c) for c in campaigns_list}

    nav_buttons = "\n".join(
        f'    <button type="button" class="campaign-btn" data-slug="{slug_from_label(c)}">{html.escape(c)}</button>'
        for c in campaigns_list
    )

    panels = "\n".join(build_campaign_panel(c, campaigns[c]) for c in campaigns_list)
    catalog = build_plot_catalog(campaigns)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>body{{background-color:white;}}</style>

  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>UCASS Intercomparison</title>
  <style>
{CSS}
</style>
</head>
<body>
  <header>
    <h1>UCASS Intercomparison</h1>
  </header>
  <nav class="campaign-nav">
    <span class="label">Date:</span>
{nav_buttons}
    <button type="button" id="comparison-tab" class="campaign-btn comparison-tab" data-slug="compare">Comparison</button>
  </nav>
{panels}
  <div id="compare-panel" class="compare-panel">
    <div class="compare-controls">
      <div class="compare-controls-row">
        <div>
          <h2>Comparison</h2>
          <p style="margin:0.35rem 0 0; font-size:0.88rem; color:#57606a;">Selected plots from different dates. Add more with Compare, or clear all.</p>
        </div>
        <button type="button" id="compare-page-clear" class="compare-clear-btn">Clear all</button>
      </div>
    </div>
    <div id="compare-grid" class="compare-grid"></div>
    <p id="compare-empty" class="compare-empty" style="display:none;">No plots selected. Use Compare on any plot to start.</p>
  </div>
  <div id="plot-lightbox" class="plot-lightbox" aria-hidden="true">
    <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
    <img src="" alt=""/>
    <p class="lightbox-caption"></p>
  </div>
  <script>window.PLOT_CATALOG = {catalog};</script>
  <script>
{JS}
</script>
</body>
</html>
"""


def main() -> None:
    output = ROOT / "index.html"
    output.write_text(build_html(), encoding="utf-8")
    campaigns = discover_campaigns()
    print(f"Built {output.name} with {len(campaigns)} date(s): {', '.join(campaigns)}")


if __name__ == "__main__":
    main()
