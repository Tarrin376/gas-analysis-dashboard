from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
import sqlite3
import statsmodels.api as sm
import numpy as np
import json
import os
from dotenv import load_dotenv

load_dotenv()

WEATHER_CACHE_FILE = "weather_cache.json"

if os.path.exists(WEATHER_CACHE_FILE):
  with open(WEATHER_CACHE_FILE, "r") as f:
    weather_cache = json.load(f)
else:
  weather_cache = {}

API_KEY = os.environ.get('API_KEY')
PRICE_SERIES_ID = "RNGWHHD"
STORAGE_SERIES_ID = "NW2_EPG0_SWO_R48_BCF"
DB_FILE = "gas_data.db"
T_BASE = 18.0
LAT, LON = 29.7604, -95.3698  # Houston

@asynccontextmanager
async def lifespan(app: FastAPI):
  try:
    await fetch_prices()
    await fetch_storage()
  except Exception as e:
    print("Error fetching data:", e)
  yield

app = FastAPI(lifespan=lifespan)

# Allow frontend to talk to backend
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# ========================
# FETCH AND STORE DATA
# ========================
def fetch_prices():
  """Fetch daily Henry Hub natural gas spot prices and store in SQLite."""
  url = f"https://api.eia.gov/v2/natural-gas/pri/fut/data/?api_key={API_KEY}&frequency=daily&data[0]=value&facets[series][]={PRICE_SERIES_ID}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000"
  r = requests.get(url)
  r.raise_for_status()
  data = r.json()["response"]["data"]
  df = pd.DataFrame(data)[["period", "value"]]
  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df = df.sort_values("period")
  conn = sqlite3.connect(DB_FILE)
  df.to_sql("prices", conn, if_exists="replace", index=False)
  conn.close()

def fetch_storage():
  """Fetch weekly US natural gas storage and store in SQLite."""
  url = f"https://api.eia.gov/v2/natural-gas/stor/wkly/data/?api_key={API_KEY}&frequency=weekly&data[0]=value&facets[series][]={STORAGE_SERIES_ID}&sort[0][column]=duoarea&sort[0][direction]=desc&offset=0&length=5000"
  r = requests.get(url)
  r.raise_for_status()
  data = r.json()["response"]["data"]
  df = pd.DataFrame(data)[["duoarea", "period", "value"]]  # duoarea is returned but not needed
  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df = df.sort_values("period")
  conn = sqlite3.connect(DB_FILE)
  df.to_sql("storage", conn, if_exists="replace", index=False)
  conn.close()

# ========================
# API ENDPOINTS
# ========================
@app.get("/prices")
def get_prices():
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM prices ORDER BY period ASC", conn)
  conn.close()
  df["period"] = df["period"].astype(str)
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df["value"] = df["value"].replace([np.inf, -np.inf], np.nan).fillna(np.nan).replace({np.nan: None})
  df = df[df["value"].notnull()]
  return df.to_dict(orient="records")

@app.get("/seasonal_prices")
def get_seasonal_prices_5yr():
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM prices ORDER BY period ASC", conn)
  conn.close()
  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df["year"] = df["period"].dt.year
  df["week"] = df["period"].dt.isocalendar().week
  current_year = df["year"].max()
  current_year_df = df[df["year"] == current_year]
  historical_df = df[(df["year"] < current_year) & (df["year"] >= current_year - 5)]
  weekly_stats = historical_df.groupby("week")["value"].agg(
    avg="mean",
    p25=lambda x: np.percentile(x, 25),
    p75=lambda x: np.percentile(x, 75)
  ).reset_index()
  current_year_days = pd.DataFrame({
    "period": pd.date_range(start=f"{current_year}-01-01", end=f"{current_year}-12-31", freq="D")
  })
  current_year_days["week"] = current_year_days["period"].dt.isocalendar().week
  daily_historical_stats = current_year_days.merge(weekly_stats, on="week", how="left")
  current_year_prices = current_year_df[["period", "value"]].to_dict(orient="records")
  historical_avg_prices = daily_historical_stats.rename(columns={"avg": "value"})[["period", "value", "p25", "p75"]].to_dict(orient="records")
  return {
    "current_year": current_year_prices,
    "historical_avg": historical_avg_prices,
  }

@app.get("/storage")
def get_storage():
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM storage ORDER BY period ASC", conn)
  conn.close()
  df["period"] = df["period"].astype(str)
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df["value"] = df["value"].replace([np.inf, -np.inf], np.nan).fillna(np.nan).replace({np.nan: None})
  df = df[df["value"].notnull()]
  return df.to_dict(orient="records")

@app.get("/seasonal_storage")
def get_seasonal_storage_5yr():
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM storage ORDER BY period ASC", conn)
  conn.close()
  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df["year"] = df["period"].dt.year
  df["week"] = df["period"].dt.isocalendar().week
  current_year = df["year"].max()
  current_year_df = df[df["year"] == current_year]
  historical_df = df[(df["year"] < current_year) & (df["year"] >= current_year - 5)]
  weekly_stats = historical_df.groupby("week")["value"].agg(
    avg="mean",
    p25=lambda x: np.percentile(x, 25),
    p75=lambda x: np.percentile(x, 75)
  ).reset_index()
  current_year_days = pd.DataFrame({
    "period": pd.date_range(start=f"{current_year}-01-01", end=f"{current_year}-12-31", freq="D")
  })
  current_year_days["week"] = current_year_days["period"].dt.isocalendar().week
  daily_historical_stats = current_year_days.merge(weekly_stats, on="week", how="left")
  current_year_storage = current_year_df[["period", "value"]].to_dict(orient="records")
  historical_avg_storage = daily_historical_stats.rename(columns={"avg": "value"})[["period", "value", "p25", "p75"]].to_dict(orient="records")
  return {
    "current_year": current_year_storage,
    "historical_avg": historical_avg_storage,
  }

@app.get("/forecast_storage")
def forecast_storage_5yr_scenarios():
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM storage ORDER BY period ASC", conn)
  conn.close()

  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df = df[df["value"].notnull()]

  if df.empty:
    return {}

  current_year = df["period"].dt.year.max()
  latest_row = df[df["period"].dt.year == current_year].iloc[-1]
  latest_storage = latest_row["value"]
  latest_date = latest_row["period"]

  historical_df = df[(df["period"].dt.year < current_year) & (df["period"].dt.year >= current_year - 5)]
  if historical_df.empty:
    return {}

  historical_df["week"] = historical_df["period"].dt.isocalendar().week
  historical_df["year"] = historical_df["period"].dt.year
  historical_df = historical_df.sort_values("period")
  historical_df["change"] = historical_df.groupby("year")["value"].diff()

  scenarios = {}
  for year in historical_df["year"].unique():
    year_changes = historical_df[historical_df["year"] == year][["week", "change"]].dropna().reset_index(drop=True)

    future_dates = pd.date_range(
      start=latest_date + pd.Timedelta(days=7),
      end=pd.Timestamp(f"{current_year}-12-31"),
      freq="7D"
    )

    storage_val = latest_storage
    forecast = []
    last_change = 0
    for date in future_dates:
      week_num = date.isocalendar().week
      week_change = year_changes.loc[year_changes.week == week_num, "change"]
      if not week_change.empty:
        last_change = week_change.iloc[0]

      storage_val += last_change
      forecast.append({"period": date, "value": storage_val})

    scenarios[str(year)] = forecast

  return scenarios

@app.get("/forecast_storage_monte_carlo")
def forecast_storage_monte_carlo_5yr(num_scenarios=1000):
  conn = sqlite3.connect(DB_FILE)
  df = pd.read_sql("SELECT * FROM storage ORDER BY period ASC", conn)
  conn.close()

  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df = df[df["value"].notnull()]
  if df.empty:
    return {}

  current_year = df["period"].dt.year.max()
  latest_row = df[df["period"].dt.year == current_year].iloc[-1]
  latest_storage = latest_row["value"]
  latest_date = latest_row["period"]

  historical_df = df[
    (df["period"].dt.year < current_year)
    & (df["period"].dt.year >= current_year - 5)
  ].copy()

  historical_df["week"] = historical_df["period"].dt.isocalendar().week
  historical_df["year"] = historical_df["period"].dt.year
  historical_df["change"] = historical_df.groupby("year")["value"].diff()

  week_changes = (
    historical_df.dropna(subset=["change"])
    .groupby("week")["change"]
    .apply(list)
    .to_dict()
  )

  future_dates = pd.date_range(
    start=latest_date + pd.Timedelta(days=7),
    end=pd.Timestamp(f"{current_year}-12-31"),
    freq="7D"
  )

  # Monte Carlo simulation
  all_scenarios = []
  for _ in range(num_scenarios):
    storage_val = latest_storage
    values = []
    for date in future_dates:
      week_num = date.isocalendar().week
      possible_changes = week_changes.get(week_num, [])
      change = np.random.choice(possible_changes) if possible_changes else 0
      storage_val += change
      values.append(storage_val)
    all_scenarios.append(values)

  all_scenarios = np.array(all_scenarios)

  # Compute percentiles across all scenarios
  p10 = np.percentile(all_scenarios, 10, axis=0)
  p50 = np.percentile(all_scenarios, 50, axis=0)
  p90 = np.percentile(all_scenarios, 90, axis=0)

  summary = [
    {"period": str(date.date()), "p10": float(lo), "p50": float(mid), "p90": float(hi)}
    for date, lo, mid, hi in zip(future_dates, p10, p50, p90)
  ]

  return {
    "scenarios": {
      f"scenario_{i+1}": [
        {"period": str(date.date()), "value": float(val)}
        for date, val in zip(future_dates, all_scenarios[i])
      ]
      for i in range(num_scenarios)
    },
    "percentiles": summary
  }

def fetch_temperature(start_date, end_date):
  key = f"hist_{start_date}_{end_date}"
  if key in weather_cache:
    df_hist = pd.DataFrame(weather_cache[key])
    df_hist['date'] = pd.to_datetime(df_hist['date'])
    return df_hist

  base_hist = "https://archive-api.open-meteo.com/v1/archive"
  params = {
    "latitude": LAT,
    "longitude": LON,
    "start_date": start_date.strftime("%Y-%m-%d"),
    "end_date": end_date.strftime("%Y-%m-%d"),
    "daily": "temperature_2m_max,temperature_2m_min",
    "timezone": "America/Chicago"
  }
  r = requests.get(base_hist, params=params)
  r.raise_for_status()
  data_hist = r.json()

  df_hist = pd.DataFrame({
    "date": data_hist["daily"]["time"],
    "tmax": data_hist["daily"]["temperature_2m_max"],
    "tmin": data_hist["daily"]["temperature_2m_min"]
  })
  df_hist["date"] = pd.to_datetime(df_hist["date"])
  df_hist['tavg'] = (df_hist['tmax'] + df_hist['tmin']) / 2
  df_hist['HDD'] = np.maximum(T_BASE - df_hist['tavg'], 0)
  df_hist['CDD'] = np.maximum(df_hist['tavg'] - T_BASE, 0)

  # Save to cache
  weather_cache[key] = df_hist.to_dict(orient="records")
  with open(WEATHER_CACHE_FILE, "w") as f:
    json.dump(weather_cache, f)

  return df_hist


def fetch_temperature_forecast(start_date, end_date, lat=LAT, lon=LON, t_base=T_BASE):
  key = f"fc_{start_date}_{end_date}"
  if key in weather_cache:
    df_fc = pd.DataFrame(weather_cache[key])
    df_fc['date'] = pd.to_datetime(df_fc['date'])
    return df_fc

  base_fc = "https://seasonal-api.open-meteo.com/v1/seasonal"
  params_fc = {
    "latitude": lat,
    "longitude": lon,
    "daily": "temperature_2m_max,temperature_2m_min",
    "start_date": start_date.strftime("%Y-%m-%d"),
    "end_date": end_date.strftime("%Y-%m-%d"),
    "timezone": "America/Chicago"
  }
  r = requests.get(base_fc, params=params_fc)
  r.raise_for_status()
  data_fc = r.json()

  df_fc = pd.DataFrame({
    "date": data_fc["daily"]["time"],
    "tmax": data_fc["daily"]["temperature_2m_max"],
    "tmin": data_fc["daily"]["temperature_2m_min"]
  })
  df_fc["date"] = pd.to_datetime(df_fc["date"])
  df_fc['tavg'] = (df_fc['tmax'] + df_fc['tmin']) / 2
  df_fc['HDD'] = np.maximum(t_base - df_fc['tavg'], 0)
  df_fc['CDD'] = np.maximum(df_fc['tavg'] - t_base, 0)

  # Save to cache
  weather_cache[key] = df_fc.to_dict(orient="records")
  with open(WEATHER_CACHE_FILE, "w") as f:
    json.dump(weather_cache, f)

  return df_fc


def fetch_storage():
  url = (
    f"https://api.eia.gov/v2/natural-gas/stor/wkly/data/"
    f"?api_key={API_KEY}"
    f"&frequency=weekly"
    f"&data[0]=value"
    f"&facets[series][]={STORAGE_SERIES_ID}"
    f"&sort[0][column]=period&sort[0][direction]=asc"
    f"&offset=0&length=5000"
  )

  r = requests.get(url)
  r.raise_for_status()
  df = pd.DataFrame(r.json()["response"]["data"])[["period", "value"]]
  df["period"] = pd.to_datetime(df["period"])
  df["value"] = pd.to_numeric(df["value"], errors="coerce")
  df = df.dropna().reset_index(drop=True)
  return df


@app.get("/forecast_storage_regression")
def forecast_storage_regression():
  # 1. Fetch storage
  df_storage = fetch_storage()
  if df_storage.empty:
    return {"percentiles": [], "scenarios": {}}

  # 2. Fetch historical temperature
  start_hist = df_storage['period'].min() - pd.Timedelta(days=7*5*52)
  end_hist = df_storage['period'].max()
  df_hist = fetch_temperature(start_hist, end_hist)

  # 3. Aggregate temperature to weekly storage
  df_storage['week_start'] = df_storage['period'] - pd.to_timedelta(6, unit='d')
  weekly_hdd_cdd = []
  for _, row in df_storage.iterrows():
    mask = (df_hist['date'] >= row['week_start']) & (df_hist['date'] <= row['period'])
    weekly_hdd_cdd.append([df_hist.loc[mask, 'HDD'].sum(), df_hist.loc[mask, 'CDD'].sum()])

  weekly_hdd_cdd = np.array(weekly_hdd_cdd)
  df_storage['HDD'] = weekly_hdd_cdd[:, 0]
  df_storage['CDD'] = weekly_hdd_cdd[:, 1]

  # 4. Compute deltaS & relative storage
  df_storage['deltaS'] = df_storage['value'].diff()
  df_storage = df_storage.dropna(subset=['deltaS']).reset_index(drop=True)
  df_storage['week'] = df_storage['period'].dt.isocalendar().week
  df_storage['year'] = df_storage['period'].dt.year
  df_storage['storage_5yr_mean'] = df_storage.groupby('week')['value'].transform(
    lambda x: x.rolling(5, min_periods=1).mean())
  df_storage['storage_rel'] = df_storage['value'] - df_storage['storage_5yr_mean']

  # 5. Month dummies
  df_storage['month'] = df_storage['period'].dt.month
  month_dummies = pd.get_dummies(df_storage['month'], prefix='month', drop_first=True)
  df_storage = pd.concat([df_storage, month_dummies], axis=1)
  df_storage[month_dummies.columns] = df_storage[month_dummies.columns].astype(float)

  # 6. Regression
  features = ['HDD','CDD','storage_rel'] + list(month_dummies.columns)
  df_storage[features] = df_storage[features].apply(pd.to_numeric, errors='coerce')
  df_storage = df_storage.dropna(subset=features + ['deltaS'])

  X = sm.add_constant(df_storage[features])
  y = df_storage['deltaS'].astype(float)
  model = sm.OLS(y, X).fit()

  # 7. Forecast
  forecast_start = df_storage['period'].max() + pd.Timedelta(days=1)
  forecast_end = forecast_start + pd.Timedelta(days=180)
  df_forecast = fetch_temperature_forecast(forecast_start, forecast_end)
  df_forecast_weekly = df_forecast.resample('W-SAT', on='date').sum().reset_index()
  df_forecast_weekly['month'] = df_forecast_weekly['date'].dt.month
  df_forecast_weekly['storage_rel'] = df_storage['storage_rel'].iloc[-1]

  month_dummies_fc = pd.get_dummies(df_forecast_weekly['month'], prefix='month', drop_first=True)
  df_forecast_weekly = pd.concat([df_forecast_weekly, month_dummies_fc], axis=1)
  for f in features:
    if f not in df_forecast_weekly.columns:
      df_forecast_weekly[f] = 0

  X_forecast = sm.add_constant(df_forecast_weekly[features], has_constant='add')

  # Monte Carlo
  n_sims = 1000
  deltaS_sim = np.zeros((len(df_forecast_weekly), n_sims))
  sigma_resid = np.std(model.resid)
  np.random.seed(42)
  for i in range(n_sims):
    noise = np.random.normal(0, sigma_resid, size=len(df_forecast_weekly))
    deltaS_sim[:,i] = model.predict(X_forecast) + noise

  last_storage = df_storage['value'].iloc[-1]
  storage_sim = deltaS_sim.cumsum(axis=0) + last_storage

  storage_p10 = np.percentile(storage_sim,10,axis=1)
  storage_p50 = np.percentile(storage_sim,50,axis=1)
  storage_p90 = np.percentile(storage_sim,90,axis=1)

  return {
    "percentiles":[
      {"period":str(df_forecast_weekly['date'].iloc[i]), "p10":float(storage_p10[i]),
        "p50":float(storage_p50[i]), "p90":float(storage_p90[i])}
      for i in range(len(df_forecast_weekly))
    ]
  }

# @app.get("/temperature")
# def hdd_forecast():
#     import numpy as np
#     import pandas as pd
#     from datetime import datetime, timedelta
#
#     # 1. Define date ranges
#     today = datetime.today()
#     start_hist = datetime(today.year - 5, 1, 1)
#     end_hist = datetime(today.year - 1, 12, 31)
#     start_current_year = datetime(today.year, 1, 1)
#     end_current_year = today
#
#     # 2. Fetch historical temps
#     df_hist = fetch_temperature(start_hist, end_hist)
#
#     # 3. Compute weekly HDD stats (10th, 50th, 90th percentile)
#     df_hist['week'] = df_hist['date'].dt.isocalendar().week
#     weekly_hdd = df_hist.groupby(['week','date']).agg(HDD=('HDD','sum')).reset_index()
#     weekly_stats = weekly_hdd.groupby('week')['HDD'].agg(
#         p10=lambda x: np.percentile(x,10),
#         p50=lambda x: np.percentile(x,50),
#         p90=lambda x: np.percentile(x,90)
#     ).reset_index()
#
#     # 4. Fetch current year actual HDD
#     df_current = fetch_temperature(start_current_year, end_current_year)
#     df_current['week'] = df_current['date'].dt.isocalendar().week
#     current_hdd = df_current.groupby('week').agg(HDD=('HDD','sum')).reset_index()
#     current_hdd = current_hdd.rename(columns={'HDD':'value'})
#
#     # 5. Fetch forecasted HDD
#     forecast_end = datetime(today.year,12,31)
#     df_forecast = fetch_temperature_forecast(end_current_year + timedelta(days=1), forecast_end)
#     df_forecast['week'] = df_forecast['date'].dt.isocalendar().week
#     forecast_hdd = df_forecast.groupby('week').agg(HDD=('HDD','sum')).reset_index()
#     forecast_hdd = forecast_hdd.rename(columns={'HDD':'value'})
#
#     return {
#         "current_year": current_hdd.to_dict(orient="records"),
#         "historical_percentiles": weekly_stats.to_dict(orient="records"),
#         "forecast": forecast_hdd.to_dict(orient="records")
#     }