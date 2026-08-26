/* Travel weather service: Open-Meteo geocoding + forecast, no map and no client API key. */
'use strict';
function travelWeatherCodeMeta(code){
  const c=Number(code)||0;
  if(c===0)return{icon:'☀️',label:'晴朗'};
  if([1,2].includes(c))return{icon:'🌤️',label:'晴间多云'};
  if(c===3)return{icon:'☁️',label:'阴天'};
  if([45,48].includes(c))return{icon:'🌫️',label:'有雾'};
  if([51,53,55,56,57].includes(c))return{icon:'🌦️',label:'毛毛雨'};
  if([61,63,65,66,67].includes(c))return{icon:'🌧️',label:'降雨'};
  if([71,73,75,77].includes(c))return{icon:'🌨️',label:'降雪'};
  if([80,81,82].includes(c))return{icon:'🌦️',label:'阵雨'};
  if([85,86].includes(c))return{icon:'🌨️',label:'阵雪'};
  if([95,96,99].includes(c))return{icon:'⛈️',label:'雷暴'};
  return{icon:'🌡️',label:'天气变化'};
}
async function resolveTravelWeatherLocation(query){
  const q=String(query||'').trim();if(!q)throw new Error('请先填写旅行目的地。');
  const params=new URLSearchParams({name:q,count:'5',language:'zh',format:'json'});
  const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if(!response.ok)throw new Error(`地点搜索失败（HTTP ${response.status}）`);
  const data=await response.json();const list=Array.isArray(data?.results)?data.results:[];
  if(!list.length)throw new Error(`没有找到“${q}”对应的天气地点，请尝试填写城市名，例如“京都”或“Tokyo”。`);
  const best=list[0];
  return {query:q,name:String(best.name||q),country:String(best.country||''),admin1:String(best.admin1||''),latitude:Number(best.latitude),longitude:Number(best.longitude),timezone:String(best.timezone||'auto')};
}
async function fetchTravelWeatherForecast(location){
  if(!location||!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude))throw new Error('天气地点坐标无效。');
  const params=new URLSearchParams({
    latitude:String(location.latitude),longitude:String(location.longitude),
    current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max',
    timezone:'auto',forecast_days:'16'
  });
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if(!response.ok)throw new Error(`天气请求失败（HTTP ${response.status}）`);
  const data=await response.json();
  const daily=[];const d=data.daily||{};const times=Array.isArray(d.time)?d.time:[];
  times.forEach((date,index)=>daily.push({date,weatherCode:Number(d.weather_code?.[index]||0),tempMax:Number(d.temperature_2m_max?.[index]||0),tempMin:Number(d.temperature_2m_min?.[index]||0),precipitationProbability:Number(d.precipitation_probability_max?.[index]||0),sunrise:String(d.sunrise?.[index]||''),sunset:String(d.sunset?.[index]||''),windMax:Number(d.wind_speed_10m_max?.[index]||0)}));
  const c=data.current||{};
  return {query:location.query||'',locationName:location.name||'',country:location.country||'',admin1:location.admin1||'',latitude:location.latitude,longitude:location.longitude,timezone:String(data.timezone||location.timezone||''),fetchedAt:nowDateTime(),current:{temperature:Number(c.temperature_2m||0),apparentTemperature:Number(c.apparent_temperature||0),humidity:Number(c.relative_humidity_2m||0),weatherCode:Number(c.weather_code||0),windSpeed:Number(c.wind_speed_10m||0)},daily};
}
async function refreshTravelWeatherForPlan(plan,query=''){
  if(!plan)throw new Error('请先选择旅行计划。');
  const location=await resolveTravelWeatherLocation(query||plan.destination);
  return await fetchTravelWeatherForecast(location);
}
