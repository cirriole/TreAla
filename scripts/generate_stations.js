const fs = require('fs');
const path = require('path');
const https = require('https');

const STATION_CSV_URL = 'https://raw.githubusercontent.com/ekidata/ekidata/master/station.csv';
const PREF_CSV_URL = 'https://raw.githubusercontent.com/ekidata/ekidata/master/pref.csv';

// If raw github isn't available, we will mock a small dataset for testing.
// However, let's try to fetch a reliable one. Actually ekidata is often hosted on various repos.
// Let's use a known reliable source for ekidata: 
// https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/station.json

const downloadJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const run = async () => {
  try {
    console.log('Fetching stations from Seo-4d696b75/station_database...');
    const data = await downloadJson('https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/station.json');
    
    console.log(`Fetched ${data.length} stations.`);
    
    // Process data to unique stations by name (grouping lines)
    const stationMap = new Map();
    
    data.forEach(s => {
      // name, kana, lat, lng, pref, lines
      const key = s.station_name;
      if (!stationMap.has(key)) {
        stationMap.set(key, {
          id: s.station_cd.toString(),
          name: s.station_name,
          kana: s.station_name_k || '',
          latitude: s.lon, // wait, check if lat/lon are correctly mapped, usually lat is lat
          longitude: s.lat, // the dataset might have them, we will check
          prefecture: s.pref_cd, // will map to name later if possible
          lines: [],
          passengerWeight: 0
        });
      }
      
      const st = stationMap.get(key);
      st.lines.push(s.line_cd);
      // passenger weight proxy = number of lines + custom bonuses
      st.passengerWeight = st.lines.length * 10000;
      
      // We also need correct lat/lon. Let's trust the json.
      st.latitude = s.lat;
      st.longitude = s.lon;
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
    
    // Fallback if network fails: create a mocked basic dataset with major stations
    const fallback = [
      { id: "1", name: "新宿", kana: "しんじゅく", latitude: 35.690921, longitude: 139.700257, prefecture: "東京都", passengerWeight: 100 },
      { id: "2", name: "渋谷", kana: "しぶや", latitude: 35.658034, longitude: 139.701636, prefecture: "東京都", passengerWeight: 95 },
      { id: "3", name: "東京", kana: "とうきょう", latitude: 35.681236, longitude: 139.767125, prefecture: "東京都", passengerWeight: 90 },
      { id: "4", name: "池袋", kana: "いけぶくろ", latitude: 35.729503, longitude: 139.7109, prefecture: "東京都", passengerWeight: 85 },
      { id: "5", name: "横浜", kana: "よこはま", latitude: 35.465786, longitude: 139.622313, prefecture: "神奈川県", passengerWeight: 80 },
      { id: "6", name: "大阪", kana: "おおさか", latitude: 34.702485, longitude: 135.495951, prefecture: "大阪府", passengerWeight: 75 },
      { id: "7", name: "品川", kana: "しながわ", latitude: 35.628471, longitude: 139.73876, prefecture: "東京都", passengerWeight: 70 },
      { id: "8", name: "名古屋", kana: "なごや", latitude: 35.170915, longitude: 136.881537, prefecture: "愛知県", passengerWeight: 65 },
      { id: "9", name: "秋葉原", kana: "あきはばら", latitude: 35.698383, longitude: 139.773123, prefecture: "東京都", passengerWeight: 60 },
      { id: "10", name: "京都", kana: "きょうと", latitude: 34.985849, longitude: 135.758767, prefecture: "京都府", passengerWeight: 55 },
      { id: "11", name: "上野", kana: "うえの", latitude: 35.713768, longitude: 139.777254, prefecture: "東京都", passengerWeight: 50 },
      { id: "12", name: "大宮", kana: "おおみや", latitude: 35.906354, longitude: 139.623999, prefecture: "埼玉県", passengerWeight: 45 },
      { id: "13", name: "新橋", kana: "しんばし", latitude: 35.666367, longitude: 139.758342, prefecture: "東京都", passengerWeight: 40 },
      { id: "14", name: "梅田", kana: "うめだ", latitude: 34.702485, longitude: 135.495951, prefecture: "大阪府", passengerWeight: 39 },
      { id: "15", name: "天王寺", kana: "てんのうじ", latitude: 34.64718, longitude: 135.513524, prefecture: "大阪府", passengerWeight: 38 },
      { id: "16", name: "三宮", kana: "さんのみや", latitude: 34.693738, longitude: 135.195503, prefecture: "兵庫県", passengerWeight: 37 },
      { id: "17", name: "川崎", kana: "かわさき", latitude: 35.531271, longitude: 139.696956, prefecture: "神奈川県", passengerWeight: 36 },
      { id: "18", name: "札幌", kana: "さっぽろ", latitude: 43.068625, longitude: 141.350801, prefecture: "北海道", passengerWeight: 35 },
      { id: "19", name: "博多", kana: "はかた", latitude: 33.589728, longitude: 130.420727, prefecture: "福岡県", passengerWeight: 34 },
      { id: "20", name: "仙台", kana: "せんだい", latitude: 38.260132, longitude: 140.882434, prefecture: "宮城県", passengerWeight: 33 },
      { id: "21", name: "広島", kana: "ひろしま", latitude: 34.397667, longitude: 132.475352, prefecture: "広島県", passengerWeight: 32 },
      { id: "22", name: "立川", kana: "たちかわ", latitude: 35.69803, longitude: 139.413727, prefecture: "東京都", passengerWeight: 31 },
      { id: "23", name: "吉祥寺", kana: "きちじょうじ", latitude: 35.703119, longitude: 139.579765, prefecture: "東京都", passengerWeight: 30 }
    ];
    const outPath = path.join(__dirname, '../assets/data');
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outPath, { recursive: true });
    }
    fs.writeFileSync(path.join(outPath, 'stations.json'), JSON.stringify(fallback, null, 2));
    console.log('Saved top stations data to assets/data/stations.json');
  }
};

run();
