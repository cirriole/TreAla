const fs = require('fs');
const path = require('path');
const https = require('https');

const STATION_CSV_URL = 'https://raw.githubusercontent.com/Seo-4d696b75/station_database/main/src/station.csv';
const PREF_CSV_URL = 'https://raw.githubusercontent.com/Seo-4d696b75/station_database/main/src/prefecture.csv';

const downloadText = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const run = async () => {
  try {
    console.log('Fetching prefectures...');
    const prefText = await downloadText(PREF_CSV_URL);
    const prefMap = new Map();
    prefText.split('\n').forEach(line => {
      if (!line) return;
      const parts = line.split(',');
      if (parts.length >= 2 && parts[0] !== 'code') {
        prefMap.set(parts[0], parts[1]);
      }
    });

    console.log('Fetching stations...');
    const stationText = await downloadText(STATION_CSV_URL);
    const lines = stationText.split('\n');
    
    console.log(`Fetched ${lines.length} station records.`);
    
    const stationMap = new Map();
    
    // code,id,name,original_name,name_kana,lat,lng,prefecture,postal_code,address,closed,open_date,closed_date,extra,attr
    lines.forEach(line => {
      if (!line) return;
      const parts = line.split(',');
      if (parts.length < 9 || parts[0] === 'code') return;
      
      const closed = parts[10];
      if (closed === '1') return; // Skip closed stations

      const name = parts[2];
      if (!stationMap.has(name)) {
        stationMap.set(name, {
          id: parts[1],
          name: name,
          kana: parts[4],
          latitude: parseFloat(parts[5]),
          longitude: parseFloat(parts[6]),
          prefecture: prefMap.get(parts[7]) || '',
          lines: 1,
          passengerWeight: 10000
        });
      } else {
        const st = stationMap.get(name);
        st.lines += 1;
        st.passengerWeight = st.lines * 10000;
      }
    });

    // Mega stations bonus
    const megaStations = ['新宿', '渋谷', '東京', '池袋', '横浜', '大阪', '梅田', '名古屋', '品川', '秋葉原'];
    const majorStations = ['京都', '札幌', '博多', '天王寺', '三宮', '大宮', '上野', '川崎', '有楽町', '新橋'];
    
    megaStations.forEach((name, i) => {
      if (stationMap.has(name)) {
        stationMap.get(name).passengerWeight += (100 - i) * 1000000;
      }
    });
    
    majorStations.forEach((name, i) => {
      if (stationMap.has(name)) {
        stationMap.get(name).passengerWeight += (100 - i) * 100000;
      }
    });

    const result = Array.from(stationMap.values()).sort((a, b) => b.passengerWeight - a.passengerWeight);
    
    const outPath = path.join(__dirname, '../assets/data');
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outPath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(outPath, 'stations.json'), JSON.stringify(result, null, 2));
    console.log(`Saved ${result.length} unique stations to assets/data/stations.json`);
  } catch (err) {
    console.error('Error:', err.message);
  }
};

run();
